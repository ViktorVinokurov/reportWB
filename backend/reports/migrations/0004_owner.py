import uuid

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reports', '0003_delete_reports_without_owner'),
    ]

    operations = [
        migrations.CreateModel(
            name='Owner',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('owner', models.CharField(error_messages={'unique': 'Такой ИП уже есть'}, max_length=255, unique=True, verbose_name='ИП')),
            ],
            options={
                'verbose_name': 'ИП',
                'verbose_name_plural': 'ИП',
            },
        ),
        migrations.AlterField(
            model_name='report',
            name='report_date',
            field=models.DateField(verbose_name='Дата отчёта'),
        ),
        migrations.AlterField(
            model_name='report',
            name='source_filename',
            field=models.TextField(verbose_name='Имена файлов'),
        ),
        migrations.AlterField(
            model_name='report',
            name='rows_count',
            field=models.PositiveIntegerField(verbose_name='Строк в файлах'),
        ),
        # Таблица пуста после 0003, поэтому обязательное поле добавляется без значения по умолчанию.
        migrations.AddField(
            model_name='report',
            name='owner',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='reports', to='reports.owner', verbose_name='ИП'),
            preserve_default=False,
        ),
        migrations.AddConstraint(
            model_name='report',
            constraint=models.UniqueConstraint(fields=('owner', 'report_date'), name='unique_owner_report_date'),
        ),
    ]
