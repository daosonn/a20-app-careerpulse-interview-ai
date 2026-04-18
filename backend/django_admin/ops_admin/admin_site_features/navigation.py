from __future__ import annotations


class OpsAdminNavigationMixin:
    def get_app_list(self, request, app_label=None):
        app_list = super().get_app_list(request, app_label)

        model_order = {
            "platformuser": 0,
            "interviewsession": 1,
            "resumeuploadrecord": 2,
            "educationbackground": 3,
            "suggestedjobrecord": 4,
            "useractivitylog": 5,
        }

        for app in app_list:
            app["models"].sort(
                key=lambda m: model_order.get(m.get("object_name", "").lower(), 999)
            )

        app_priority = {
            "Operations Admin": 0,
            "Authentication and Authorization": 1,
        }
        app_list.sort(key=lambda a: app_priority.get(a.get("name", ""), 999))
        return app_list
