from django.http import JsonResponse
from django.urls import path
from ops_admin.admin_site import ops_admin_site


def health(_: object) -> JsonResponse:
    return JsonResponse({"status": "ok", "service": "django-admin"})


urlpatterns = [
    path("", health, name="health"),
    path("admin/", ops_admin_site.urls),
]
