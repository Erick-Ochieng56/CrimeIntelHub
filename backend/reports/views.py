from rest_framework import viewsets, permissions, generics, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.http import FileResponse, Http404, HttpResponse
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q
import os
import io
import csv
import tempfile
import logging
from datetime import datetime, timedelta
import pandas as pd
from openpyxl import Workbook
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from .models import Report, ReportTemplate, ScheduledReport
from .serializers import (
    ReportSerializer, ReportTemplateSerializer, ScheduledReportSerializer,
    ReportGenerationSerializer, ReportPreviewSerializer
)
from crimes.models import Crime, CrimeCategory, District, Neighborhood

logger = logging.getLogger(__name__)


class ReportViewSet(viewsets.ModelViewSet):
    """API endpoint for user reports."""
    
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return Report.objects.all().order_by('-created_at') 
        """Return reports for the current user."""
        return Report.objects.filter(user=self.request.user).order_by('-created_at')
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Download a report file."""
        report = self.get_object()
        
        if report.status != 'completed' or not report.file_path:
            return Response(
                {'error': 'Report is not ready for download'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            file_path = report.file_path
            if not os.path.exists(file_path):
                return Response(
                    {'error': 'Report file not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Determine the content type based on the file format
            content_types = {
                'pdf': 'application/pdf',
                'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'csv': 'text/csv'
            }
            content_type = content_types.get(report.format, 'application/octet-stream')
            
            # Create a filename for the download
            filename = f"{report.title.replace(' ', '_')}_{report.id}.{report.format}"
            if report.format == 'excel':
                filename = filename.replace('excel', 'xlsx')
            
            response = FileResponse(
                open(file_path, 'rb'),
                content_type=content_type
            )
            response['Content-Disposition'] = f'attachment; filename="{filename}"'
            return response
            
        except Exception as e:
            logger.error(f"Error downloading report {report.id}: {str(e)}")
            return Response(
                {'error': 'Failed to download report'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'])
    def view(self, request, pk=None):
        """View a report."""
        report = self.get_object()
        
        # For PDF or Excel reports, redirect to download
        # For other formats, return the content directly
        return self.download(request, pk)


class ReportTemplateViewSet(viewsets.ReadOnlyModelViewSet):
    """API endpoint for report templates."""
    
    queryset = ReportTemplate.objects.all()
    serializer_class = ReportTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]


class ScheduledReportViewSet(viewsets.ModelViewSet):
    """API endpoint for scheduled reports."""
    
    serializer_class = ScheduledReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        if self.request.user.is_staff:
            return ScheduledReport.objects.all().order_by('-created_at')
        """Return scheduled reports for the current user."""
        return ScheduledReport.objects.filter(user=self.request.user).order_by('-created_at')


class ReportGeneratorView(generics.GenericAPIView):
    """API endpoint for generating reports."""
    
    serializer_class = ReportGenerationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Generate a new report."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract data from the request
        title = serializer.validated_data['title']
        description = serializer.validated_data.get('description', '')
        report_type = serializer.validated_data['report_type']
        time_range = serializer.validated_data.get('time_range', 30)
        crime_types_ids = serializer.validated_data.get('crime_types', [])
        locations_ids = serializer.validated_data.get('locations', [])
        include_charts = serializer.validated_data.get('include_charts', True)
        include_map = serializer.validated_data.get('include_map', True)
        report_format = serializer.validated_data.get('format', 'pdf')
        
        # Create a new report
        report = Report.objects.create(
            user=request.user,
            title=title,
            description=description,
            report_type=report_type,
            time_range=time_range,
            include_charts=include_charts,
            include_map=include_map,
            format=report_format,
            status='processing',
            progress=0
        )
        
        # Add crime types
        if crime_types_ids:
            crime_categories = CrimeCategory.objects.filter(name__in=crime_types_ids)
            report.crime_types.set(crime_categories)
        
        # Add districts/neighborhoods based on locations
        if locations_ids:
            districts = District.objects.filter(name__in=locations_ids)
            report.districts.set(districts)
            
            neighborhoods = Neighborhood.objects.filter(name__in=locations_ids)
            report.neighborhoods.set(neighborhoods)
        
        # Generate the report asynchronously (ideally this would be in a Celery task)
        try:
            # Update progress
            report.progress = 10
            report.save()
            
            # Fetch data based on filters
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=time_range)
            
            # Build the query
            query = Q(date__gte=start_date, date__lte=end_date)
            
            if crime_types_ids and 'all' not in crime_types_ids:
                crime_query = Q()
                for crime_type in crime_types_ids:
                    crime_query |= Q(category__name__icontains=crime_type)
                query &= crime_query
            
            if locations_ids and 'all' not in locations_ids:
                location_query = Q()
                for location in locations_ids:
                    location_query |= Q(district__name__icontains=location)
                    location_query |= Q(neighborhood__name__icontains=location)
                query &= location_query
            
            # Fetch crimes
            crimes = Crime.objects.filter(query).order_by('-date')
            
            # Update progress
            report.progress = 30
            report.save()
            
            # Generate the report based on format
            file_path = self.generate_report_file(
                report,
                crimes,
                report_format,
                include_charts,
                include_map
            )
            
            if file_path:
                # Get file size
                file_size = os.path.getsize(file_path)
                
                # Update report with file information
                report.file_path = file_path
                report.file_size = file_size
                report.status = 'completed'
                report.progress = 100
                report.completed_at = timezone.now()
                report.save()
                
                return Response({
                    'id': report.id,
                    'status': 'completed',
                    'message': 'Report generated successfully',
                    'download_url': report.get_file_url()
                })
            else:
                # Something went wrong during generation
                report.status = 'failed'
                report.error_message = 'Failed to create report file'
                report.save()
                
                return Response({
                    'error': 'Failed to generate report'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            
            # Update report with error information
            report.status = 'failed'
            report.error_message = str(e)
            report.save()
            
            return Response({
                'error': 'An error occurred while generating the report'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def generate_report_file(self, report, crimes, report_format, include_charts, include_map):
        """Generate the report file based on format."""
        try:
            # Create directory for reports if it doesn't exist
            reports_dir = os.path.join(tempfile.gettempdir(), 'crime_reports')
            os.makedirs(reports_dir, exist_ok=True)
            
            # Base filename for the report
            base_filename = f"report_{report.id}_{int(timezone.now().timestamp())}"
            
            # Convert crimes queryset to a list of dictionaries for easier processing
            crime_data = [{
                'id': crime.id,
                'case_number': crime.case_number,
                'category': crime.category.name if crime.category else 'Unknown',
                'date': crime.date,
                'time': crime.time,
                'description': crime.description,
                'location': crime.block_address,
                'district': crime.district.name if crime.district else 'Unknown',
                'neighborhood': crime.neighborhood.name if crime.neighborhood else 'Unknown',
                'is_violent': crime.is_violent,
                'status': crime.status
            } for crime in crimes]
            
            # Update progress
            report.progress = 50
            report.save()
            
            # Generate the report based on format
            if report_format == 'pdf':
                file_path = os.path.join(reports_dir, f"{base_filename}.pdf")
                self.generate_pdf_report(file_path, report, crime_data, include_charts, include_map)
                return file_path
                
            elif report_format == 'excel':
                file_path = os.path.join(reports_dir, f"{base_filename}.xlsx")
                self.generate_excel_report(file_path, report, crime_data, include_charts)
                return file_path
                
            elif report_format == 'csv':
                file_path = os.path.join(reports_dir, f"{base_filename}.csv")
                self.generate_csv_report(file_path, crime_data)
                return file_path
            
            else:
                logger.error(f"Unsupported report format: {report_format}")
                return None
                
        except Exception as e:
            logger.error(f"Error generating report file: {str(e)}")
            raise
    
    def generate_pdf_report(self, file_path, report, crime_data, include_charts, include_map):
        """Generate a PDF report."""
        # Create a PDF document
        doc = SimpleDocTemplate(file_path, pagesize=letter)
        elements = []
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = styles['Title']
        heading_style = styles['Heading1']
        normal_style = styles['Normal']
        
        # Add title and description
        elements.append(Paragraph(report.title, title_style))
        elements.append(Spacer(1, 12))
        
        if report.description:
            elements.append(Paragraph(report.description, normal_style))
            elements.append(Spacer(1, 12))
        
        # Add report information
        elements.append(Paragraph("Report Information", heading_style))
        elements.append(Spacer(1, 6))
        
        report_info = [
            ["Report Type:", report.get_report_type_display()],
            ["Time Range:", f"{report.time_range} days"],
            ["Generated On:", timezone.now().strftime("%Y-%m-%d %H:%M")],
            ["Generated By:", report.user.username],
        ]
        
        report_table = Table(report_info, colWidths=[120, 300])
        report_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(report_table)
        elements.append(Spacer(1, 12))
        
        # Add crime statistics
        elements.append(Paragraph("Crime Statistics", heading_style))
        elements.append(Spacer(1, 6))
        
        total_crimes = len(crime_data)
        violent_crimes = sum(1 for crime in crime_data if crime['is_violent'])
        
        # Count by category
        category_counts = {}
        for crime in crime_data:
            category = crime['category']
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Sort categories by count
        sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        
        stats_info = [
            ["Total Crimes:", str(total_crimes)],
            ["Violent Crimes:", str(violent_crimes)],
            ["Non-Violent Crimes:", str(total_crimes - violent_crimes)],
        ]
        
        stats_table = Table(stats_info, colWidths=[120, 300])
        stats_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(stats_table)
        elements.append(Spacer(1, 12))
        
        # Add top crime categories
        elements.append(Paragraph("Top Crime Categories", heading_style))
        elements.append(Spacer(1, 6))
        
        top_categories = [["Category", "Count", "Percentage"]]
        for category, count in sorted_categories[:5]:  # Top 5 categories
            percentage = (count / total_crimes) * 100 if total_crimes > 0 else 0
            top_categories.append([category, str(count), f"{percentage:.1f}%"])
        
        top_table = Table(top_categories, colWidths=[200, 100, 120])
        top_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        elements.append(top_table)
        elements.append(Spacer(1, 12))
        
        # Add crime listing
        elements.append(Paragraph("Crime Details", heading_style))
        elements.append(Spacer(1, 6))
        
        # Limit to max 100 crimes for PDF
        limited_crime_data = crime_data[:100] if len(crime_data) > 100 else crime_data
        
        if limited_crime_data:
            crime_table_data = [["Date", "Category", "Location", "Status"]]
            for crime in limited_crime_data:
                crime_table_data.append([
                    crime['date'].strftime("%Y-%m-%d"),
                    crime['category'],
                    crime['location'],
                    crime['status'].replace('_', ' ').title()
                ])
            
            crime_table = Table(crime_table_data, colWidths=[80, 120, 220, 100])
            crime_table.setStyle(TableStyle([
                ('GRID', (0, 0), (-1, -1), 0.25, colors.grey),
                ('BACKGROUND', (0, 0), (-1, 0), colors.lightgrey),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ]))
            elements.append(crime_table)
            
            if len(crime_data) > 100:
                elements.append(Spacer(1, 6))
                elements.append(Paragraph(f"Showing 100 of {len(crime_data)} crimes", normal_style))
        else:
            elements.append(Paragraph("No crimes found matching the criteria", normal_style))
        
        # Build the PDF
        doc.build(elements)
    
    def generate_excel_report(self, file_path, report, crime_data, include_charts):
        """Generate an Excel report."""
        # Create a workbook and add sheets
        wb = Workbook()
        
        # Summary sheet
        summary_sheet = wb.active
        summary_sheet.title = "Summary"
        
        # Add title and information
        summary_sheet['A1'] = report.title
        summary_sheet['A3'] = "Report Type:"
        summary_sheet['B3'] = report.get_report_type_display()
        summary_sheet['A4'] = "Time Range:"
        summary_sheet['B4'] = f"{report.time_range} days"
        summary_sheet['A5'] = "Generated On:"
        summary_sheet['B5'] = timezone.now().strftime("%Y-%m-%d %H:%M")
        summary_sheet['A6'] = "Generated By:"
        summary_sheet['B6'] = report.user.username
        
        # Add statistics
        summary_sheet['A8'] = "STATISTICS"
        summary_sheet['A9'] = "Total Crimes:"
        summary_sheet['B9'] = len(crime_data)
        
        violent_crimes = sum(1 for crime in crime_data if crime['is_violent'])
        summary_sheet['A10'] = "Violent Crimes:"
        summary_sheet['B10'] = violent_crimes
        summary_sheet['A11'] = "Non-Violent Crimes:"
        summary_sheet['B11'] = len(crime_data) - violent_crimes
        
        # Count by category
        category_counts = {}
        for crime in crime_data:
            category = crime['category']
            category_counts[category] = category_counts.get(category, 0) + 1
        
        # Sort categories by count
        sorted_categories = sorted(category_counts.items(), key=lambda x: x[1], reverse=True)
        
        # Add top categories
        summary_sheet['A13'] = "TOP CRIME CATEGORIES"
        summary_sheet['A14'] = "Category"
        summary_sheet['B14'] = "Count"
        summary_sheet['C14'] = "Percentage"
        
        row = 15
        for category, count in sorted_categories[:10]:  # Top 10 categories
            percentage = (count / len(crime_data)) * 100 if len(crime_data) > 0 else 0
            summary_sheet[f'A{row}'] = category
            summary_sheet[f'B{row}'] = count
            summary_sheet[f'C{row}'] = f"{percentage:.1f}%"
            row += 1
        
        # Crime details sheet
        details_sheet = wb.create_sheet(title="Crime Details")
        
        # Headers
        details_sheet['A1'] = "Case Number"
        details_sheet['B1'] = "Date"
        details_sheet['C1'] = "Time"
        details_sheet['D1'] = "Category"
        details_sheet['E1'] = "Description"
        details_sheet['F1'] = "Location"
        details_sheet['G1'] = "District"
        details_sheet['H1'] = "Neighborhood"
        details_sheet['I1'] = "Violent"
        details_sheet['J1'] = "Status"
        
        # Data
        for i, crime in enumerate(crime_data, 2):  # Start from row 2
            details_sheet[f'A{i}'] = crime['case_number']
            details_sheet[f'B{i}'] = crime['date'].strftime("%Y-%m-%d")
            details_sheet[f'C{i}'] = crime['time'].strftime("%H:%M") if crime['time'] else ""
            details_sheet[f'D{i}'] = crime['category']
            details_sheet[f'E{i}'] = crime['description']
            details_sheet[f'F{i}'] = crime['location']
            details_sheet[f'G{i}'] = crime['district']
            details_sheet[f'H{i}'] = crime['neighborhood']
            details_sheet[f'I{i}'] = "Yes" if crime['is_violent'] else "No"
            details_sheet[f'J{i}'] = crime['status'].replace('_', ' ').title()
        
        # Save the workbook
        wb.save(file_path)
    
    def generate_csv_report(self, file_path, crime_data):
        """Generate a CSV report."""
        with open(file_path, 'w', newline='') as csvfile:
            # Define headers
            fieldnames = [
                'case_number', 'date', 'time', 'category', 'description',
                'location', 'district', 'neighborhood', 'is_violent', 'status'
            ]
            
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            
            # Write data
            for crime in crime_data:
                writer.writerow({
                    'case_number': crime['case_number'],
                    'date': crime['date'].strftime("%Y-%m-%d"),
                    'time': crime['time'].strftime("%H:%M") if crime['time'] else "",
                    'category': crime['category'],
                    'description': crime['description'],
                    'location': crime['location'],
                    'district': crime['district'],
                    'neighborhood': crime['neighborhood'],
                    'is_violent': "Yes" if crime['is_violent'] else "No",
                    'status': crime['status'].replace('_', ' ').title()
                })


class ReportPreviewView(generics.GenericAPIView):
    """API endpoint for previewing reports."""
    
    serializer_class = ReportPreviewSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request, *args, **kwargs):
        """Generate a report preview."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Extract data from the request
        report_type = serializer.validated_data['report_type']
        time_range = serializer.validated_data.get('time_range', 30)
        crime_types_ids = serializer.validated_data.get('crime_types', [])
        locations_ids = serializer.validated_data.get('locations', [])
        
        try:
            # Calculate date range
            end_date = timezone.now().date()
            start_date = end_date - timedelta(days=time_range)
            
            # Build the query
            query = Q(date__gte=start_date, date__lte=end_date)
            
            if crime_types_ids and 'all' not in crime_types_ids:
                crime_query = Q()
                for crime_type in crime_types_ids:
                    crime_query |= Q(category__name__icontains=crime_type)
                query &= crime_query
            
            if locations_ids and 'all' not in locations_ids:
                location_query = Q()
                for location in locations_ids:
                    location_query |= Q(district__name__icontains=location)
                    location_query |= Q(neighborhood__name__icontains=location)
                query &= location_query
            
            # Fetch crimes and calculate stats
            crimes = Crime.objects.filter(query).select_related('category', 'district', 'neighborhood')
            
            total_crimes = crimes.count()
            violent_crimes = crimes.filter(is_violent=True).count()
            
            # Get top crime categories
            from django.db.models import Count
            top_categories = list(crimes.values('category__name')
                               .annotate(count=Count('id'))
                               .order_by('-count')[:5])
            
            # Get crime trend over time
            from django.db.models.functions import TruncDay
            crime_trend = list(crimes.annotate(day=TruncDay('date'))
                           .values('day')
                           .annotate(count=Count('id'))
                           .order_by('day'))
            
            # Return preview data
            return Response({
                'total_crimes': total_crimes,
                'violent_crimes': violent_crimes,
                'non_violent_crimes': total_crimes - violent_crimes,
                'top_categories': top_categories,
                'trend_data': crime_trend,
                'preview_date': timezone.now().strftime("%Y-%m-%d %H:%M"),
                'report_type': report_type,
                'time_range': time_range
            })
            
        except Exception as e:
            logger.error(f"Error generating report preview: {str(e)}")
            return Response({
                'error': 'An error occurred while generating the preview'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
