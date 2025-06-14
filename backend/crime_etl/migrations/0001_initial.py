# Generated by Django 5.1.7 on 2025-03-17 12:13

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('crimes', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DataSource',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('source_type', models.CharField(choices=[('api', 'API'), ('file', 'File Upload'), ('database', 'External Database'), ('scraper', 'Web Scraper'), ('other', 'Other')], max_length=20)),
                ('configuration', models.JSONField(default=dict, help_text='Connection details, API keys, etc.')),
                ('mapping', models.JSONField(default=dict, help_text='Field mapping configuration')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='data_sources', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Data sources',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='DataTransformation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('transformation_type', models.CharField(choices=[('field_mapping', 'Field Mapping'), ('geocoding', 'Geocoding'), ('deduplication', 'Deduplication'), ('normalization', 'Normalization'), ('enrichment', 'Data Enrichment'), ('filtering', 'Filtering'), ('custom', 'Custom Transformation')], max_length=30)),
                ('configuration', models.JSONField(default=dict)),
                ('order', models.IntegerField(default=0, help_text='Order of execution')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='transformations', to=settings.AUTH_USER_MODEL)),
                ('data_source', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='transformations', to='crime_etl.datasource')),
            ],
            options={
                'verbose_name_plural': 'Data transformations',
                'ordering': ['order', 'name'],
            },
        ),
        migrations.CreateModel(
            name='ExportJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('format', models.CharField(choices=[('csv', 'CSV'), ('json', 'JSON'), ('excel', 'Excel'), ('geojson', 'GeoJSON'), ('shapefile', 'Shapefile'), ('kml', 'KML')], max_length=20)),
                ('parameters', models.JSONField(default=dict, help_text='Filter parameters')),
                ('include_fields', models.JSONField(blank=True, default=list, help_text='Specific fields to include', null=True)),
                ('exclude_fields', models.JSONField(blank=True, default=list, help_text='Specific fields to exclude', null=True)),
                ('file_path', models.CharField(blank=True, max_length=255, null=True)),
                ('file_size', models.IntegerField(blank=True, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('canceled', 'Canceled')], default='pending', max_length=20)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('records_exported', models.IntegerField(default=0)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='export_jobs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name_plural': 'Export jobs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ImportJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('file_path', models.CharField(blank=True, max_length=255, null=True)),
                ('parameters', models.JSONField(blank=True, default=dict, null=True)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('processing', 'Processing'), ('completed', 'Completed'), ('failed', 'Failed'), ('canceled', 'Canceled')], default='pending', max_length=20)),
                ('started_at', models.DateTimeField(blank=True, null=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('records_processed', models.IntegerField(default=0)),
                ('records_created', models.IntegerField(default=0)),
                ('records_updated', models.IntegerField(default=0)),
                ('records_failed', models.IntegerField(default=0)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('error_details', models.JSONField(blank=True, default=list, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='import_jobs', to=settings.AUTH_USER_MODEL)),
                ('data_source', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='import_jobs', to='crime_etl.datasource')),
            ],
            options={
                'verbose_name_plural': 'Import jobs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ImportLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('external_id', models.CharField(max_length=100)),
                ('source_data', models.JSONField(default=dict)),
                ('transformed_data', models.JSONField(default=dict)),
                ('status', models.CharField(max_length=20)),
                ('message', models.TextField(blank=True, null=True)),
                ('errors', models.JSONField(blank=True, default=list, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('crime', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='import_logs', to='crimes.crime')),
                ('import_job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='logs', to='crime_etl.importjob')),
            ],
            options={
                'verbose_name_plural': 'Import logs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='ScheduledImport',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('description', models.TextField(blank=True, null=True)),
                ('frequency', models.CharField(choices=[('hourly', 'Hourly'), ('daily', 'Daily'), ('weekly', 'Weekly'), ('monthly', 'Monthly')], max_length=20)),
                ('time_of_day', models.TimeField(blank=True, null=True)),
                ('day_of_week', models.IntegerField(blank=True, help_text='1-7 (Monday-Sunday)', null=True)),
                ('day_of_month', models.IntegerField(blank=True, help_text='1-31', null=True)),
                ('parameters', models.JSONField(blank=True, default=dict, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('last_run', models.DateTimeField(blank=True, null=True)),
                ('next_run', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scheduled_imports', to=settings.AUTH_USER_MODEL)),
                ('data_source', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='scheduled_imports', to='crime_etl.datasource')),
            ],
            options={
                'verbose_name_plural': 'Scheduled imports',
                'ordering': ['name'],
            },
        ),
    ]
