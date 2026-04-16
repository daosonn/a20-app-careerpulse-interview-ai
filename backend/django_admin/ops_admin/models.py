from __future__ import annotations

from django.db import models


class PlatformUser(models.Model):
    id = models.BigAutoField(primary_key=True)
    email = models.CharField(max_length=255, unique=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    avatar = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    last_cv_uploaded_at = models.DateTimeField(blank=True, null=True)
    last_profile_update_at = models.DateTimeField(blank=True, null=True)
    last_activity_at = models.DateTimeField(blank=True, null=True)

    cv_text = models.TextField(blank=True, null=True)
    skills = models.JSONField(blank=True, null=True)
    is_onboarded = models.BooleanField(default=False)
    full_name = models.CharField(max_length=255, blank=True, null=True)
    dob = models.CharField(max_length=100, blank=True, null=True)
    current_position = models.CharField(max_length=255, blank=True, null=True)

    preferred_language = models.CharField(max_length=32, blank=True, null=True)
    difficulty = models.CharField(max_length=64, blank=True, null=True)
    ai_persona = models.CharField(max_length=128, blank=True, null=True)
    availability = models.CharField(max_length=255, blank=True, null=True)
    default_interview_type = models.CharField(max_length=64, blank=True, null=True)
    stress_test_default = models.BooleanField(default=False)
    auto_read_questions = models.BooleanField(default=True)
    questions_per_session = models.IntegerField(default=5)

    ui_language = models.CharField(max_length=32, blank=True, null=True)
    theme = models.CharField(max_length=32, blank=True, null=True)
    email_reminders = models.BooleanField(default=True)
    ai_suggestions = models.BooleanField(default=True)
    security_alerts = models.BooleanField(default=True)
    public_profile = models.BooleanField(default=False)
    anonymous_practice = models.BooleanField(default=False)

    class Meta:
        managed = False
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self) -> str:
        return self.full_name or self.name or self.email

    @property
    def profile_completeness_score(self) -> int:
        score = 0
        if self.full_name:
            score += 15
        if self.dob:
            score += 10
        if self.current_position:
            score += 15
        if self.cv_text and self.cv_text.strip():
            score += 20
        if isinstance(self.skills, list) and len(self.skills) > 0:
            score += 15
        if self.education_records.exists():
            score += 10
        if self.is_onboarded:
            score += 15
        return min(score, 100)


class EducationBackground(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        PlatformUser,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="education_records",
    )
    school = models.CharField(max_length=255)
    degree = models.CharField(max_length=255, blank=True, null=True)
    field = models.CharField(max_length=255, blank=True, null=True)
    year = models.CharField(max_length=50, blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "educations"
        verbose_name = "Education Background"
        verbose_name_plural = "Education Backgrounds"

    def __str__(self) -> str:
        return f"{self.school} ({self.user.email})"


class InterviewSession(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        PlatformUser,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="interview_sessions",
    )
    cv_text = models.TextField(blank=True, null=True)
    jd_text = models.TextField(blank=True, null=True)
    interview_type = models.CharField(max_length=64, blank=True, null=True)
    language = models.CharField(max_length=32, blank=True, null=True)
    transcript = models.JSONField(blank=True, null=True)
    evaluations = models.JSONField(blank=True, null=True)
    final_report = models.TextField(blank=True, null=True)
    score = models.IntegerField(default=0)
    status = models.CharField(max_length=32, blank=True, null=True)
    predicted_questions = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "interviews"
        verbose_name = "Interview Session"
        verbose_name_plural = "Interview Sessions"

    def __str__(self) -> str:
        return f"Session #{self.id} - {self.user.email}"


class ResumeUploadRecord(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        PlatformUser,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="resume_upload_records",
    )
    file_name = models.CharField(max_length=255, blank=True, null=True)
    source = models.CharField(max_length=64, blank=True, null=True)
    raw_text = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=32, blank=True, null=True)
    parsed_skills = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)
    processed_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "resume_uploads"
        verbose_name = "Resume Upload"
        verbose_name_plural = "Resume Uploads"

    def __str__(self) -> str:
        return f"{self.file_name or 'CV'} ({self.user.email})"


class SuggestedJobRecord(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        PlatformUser,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="suggested_job_records",
    )
    title = models.CharField(max_length=255)
    company = models.CharField(max_length=255, blank=True, null=True)
    industry = models.CharField(max_length=255, blank=True, null=True)
    fit_score = models.IntegerField(default=0)
    reason = models.TextField(blank=True, null=True)
    source = models.CharField(max_length=64, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(blank=True, null=True)
    updated_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "suggested_jobs"
        verbose_name = "Suggested Job"
        verbose_name_plural = "Suggested Jobs"

    def __str__(self) -> str:
        return f"{self.title} ({self.user.email})"


class UserActivityLog(models.Model):
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(
        PlatformUser,
        on_delete=models.DO_NOTHING,
        db_column="user_id",
        related_name="activity_logs",
    )
    event_type = models.CharField(max_length=128)
    details = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "user_activities"
        verbose_name = "User Activity"
        verbose_name_plural = "User Activities"

    def __str__(self) -> str:
        return f"{self.event_type} ({self.user.email})"
