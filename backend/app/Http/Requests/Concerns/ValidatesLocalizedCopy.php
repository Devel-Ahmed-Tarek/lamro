<?php

namespace App\Http\Requests\Concerns;

use App\Support\Locales;

trait ValidatesLocalizedCopy
{
    /**
     * @return array<string, list<string>>
     */
    protected function localizedCopyRules(string $field, bool $required = false, int $max = 255): array
    {
        $rules = [
            $field => [$required ? 'required' : 'nullable', 'array'],
        ];
        foreach (Locales::all() as $locale) {
            $rules[$field.'.'.$locale] = ['nullable', 'string', 'max:'.$max];
        }

        return $rules;
    }

    /**
     * @return array<string, list<string>>
     */
    protected function localizedSpecLabelRules(): array
    {
        $rules = [
            'specs.*.label' => ['required_with:specs', 'array'],
        ];
        foreach (Locales::all() as $locale) {
            $rules['specs.*.label.'.$locale] = ['nullable', 'string', 'max:120'];
        }

        return $rules;
    }
}
