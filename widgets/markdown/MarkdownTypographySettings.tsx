import { Button, Select } from '../../components/ui';
import { RangeField } from '../../components/ui/RangeField';
import {
  DEFAULT_MARKDOWN_TYPOGRAPHY,
  type MarkdownTypography,
} from './typography';

export function MarkdownTypographySettings({
  value = DEFAULT_MARKDOWN_TYPOGRAPHY,
  onChange,
}: {
  value?: MarkdownTypography;
  onChange: (value: MarkdownTypography) => void;
}) {
  const change = (changes: Partial<MarkdownTypography>) =>
    onChange({ ...value, ...changes });
  return (
    <section className="space-y-4 border-t border-theme-border-subtle px-2 pt-4">
      <h3 className="text-sm font-semibold">Оформление текста</h3>
      <RangeField
        label="Размер основного текста"
        value={value.fontSize}
        min={12}
        max={28}
        onChange={(fontSize) => change({ fontSize })}
      />
      <label className="block space-y-2">
        <span>Межстрочный интервал</span>
        <Select
          aria-label="Межстрочный интервал"
          dropdownPosition="static"
          value={value.lineSpacing}
          options={[
            { value: 'compact', label: 'Компактный' },
            { value: 'normal', label: 'Обычный' },
            { value: 'relaxed', label: 'Свободный' },
          ]}
          onValueChange={(lineSpacing) => {
            if (
              lineSpacing === 'compact' ||
              lineSpacing === 'normal' ||
              lineSpacing === 'relaxed'
            )
              change({ lineSpacing });
          }}
        />
      </label>
      <RangeField
        label="Ширина текста при чтении"
        value={value.readerWidth}
        min={45}
        max={100}
        unit="ch"
        onChange={(readerWidth) => change({ readerWidth })}
      />
      <RangeField
        label="Размер заголовка карточки"
        value={value.titleSize}
        min={14}
        max={36}
        onChange={(titleSize) => change({ titleSize })}
      />
      <label className="block space-y-2">
        <span>Выравнивание заголовка</span>
        <Select
          aria-label="Выравнивание заголовка"
          dropdownPosition="static"
          value={value.titleAlign}
          options={[
            { value: 'left', label: 'Слева' },
            { value: 'center', label: 'По центру' },
            { value: 'right', label: 'Справа' },
          ]}
          onValueChange={(titleAlign) => {
            if (
              titleAlign === 'left' ||
              titleAlign === 'center' ||
              titleAlign === 'right'
            )
              change({ titleAlign });
          }}
        />
      </label>
      <Button
        size="small"
        variant="ghost"
        onClick={() => onChange({ ...DEFAULT_MARKDOWN_TYPOGRAPHY })}
      >
        Вернуть стандартное оформление текста
      </Button>
    </section>
  );
}
