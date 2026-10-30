from django.db import migrations


def delete_reports(apps, schema_editor):
    """У отчёта появляется обязательный владелец (ИП) — старые отчёты загружаются заново."""
    apps.get_model("reports", "Report").objects.all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0002_tax_per_sale'),
    ]

    operations = [
        migrations.RunPython(delete_reports, migrations.RunPython.noop),
    ]
