from rest_framework.pagination import PageNumberPagination


class FlexiblePageNumberPagination(PageNumberPagination):
    """Allow clients to override page size via page_size or limit."""

    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 2000

    def get_page_size(self, request):
        # Map / legacy clients send `limit` instead of `page_size`
        if self.page_size_query_param:
            try:
                if 'limit' in request.query_params and 'page_size' not in request.query_params:
                    size = int(request.query_params['limit'])
                    if size > 0:
                        return min(size, self.max_page_size)
            except (KeyError, ValueError):
                pass
        return super().get_page_size(request)
