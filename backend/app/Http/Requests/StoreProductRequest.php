<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $status = $this->input('status', 'draft');
        $publishing = in_array($status, ['published'], true);

        return [
            'category_id' => [$publishing ? 'required' : 'nullable', 'exists:categories,id'],
            'brand_id' => [$publishing ? 'required' : 'nullable', 'exists:brands,id'],
            'slug' => ['nullable', 'string', 'max:190', 'unique:products,slug'],
            'name' => [$publishing ? 'required' : 'nullable', 'array'],
            'name.de' => [$publishing ? 'required' : 'nullable', 'string', 'max:255'],
            'name.en' => [$publishing ? 'required' : 'nullable', 'string', 'max:255'],
            'summary' => ['nullable', 'array'],
            'summary.de' => ['nullable', 'string'],
            'summary.en' => ['nullable', 'string'],
            'notes' => ['nullable', 'array'],
            'notes.de' => ['nullable', 'string'],
            'notes.en' => ['nullable', 'string'],
            'part_number' => [$publishing ? 'required' : 'nullable', 'string', 'max:120'],
            'model' => ['nullable', 'string', 'max:120'],
            'sku' => [$publishing ? 'required' : 'nullable', 'string', 'max:120', 'unique:products,sku'],
            'serial' => ['nullable', 'string', 'max:120'],
            'condition' => [$publishing ? 'required' : 'nullable', Rule::in(['new', 'used', 'refurbished', 'parts'])],
            'testing' => [$publishing ? 'required' : 'nullable', Rule::in(['tested', 'working', 'untested', 'defective', 'partial', 'unknown'])],
            'price' => [$publishing ? 'required' : 'nullable', 'numeric', 'min:0'],
            'price_cents' => ['nullable', 'integer', 'min:0'],
            'total_stock' => ['nullable', 'integer', 'min:0'],
            'reserved_auction' => ['nullable', 'integer', 'min:0'],
            'reserved_order' => ['nullable', 'integer', 'min:0'],
            'weight' => ['nullable', 'string', 'max:80'],
            'dimensions' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['draft', 'published', 'archived'])],
            'allow_cart' => ['nullable', 'boolean'],
            'allow_buy_now' => ['nullable', 'boolean'],
            'allow_offer' => ['nullable', 'boolean'],
            'allow_quote' => ['nullable', 'boolean'],
            'allow_inquiry' => ['nullable', 'boolean'],
            'specs' => ['nullable', 'array'],
            'specs.*.label' => ['required_with:specs', 'array'],
            'specs.*.label.de' => ['nullable', 'string', 'max:120'],
            'specs.*.label.en' => ['nullable', 'string', 'max:120'],
            'specs.*.value' => ['required_with:specs', 'string', 'max:255'],
        ];
    }
}
