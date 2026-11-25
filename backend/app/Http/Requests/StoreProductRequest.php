<?php

namespace App\Http\Requests;

use App\Http\Requests\Concerns\ValidatesLocalizedCopy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProductRequest extends FormRequest
{
    use ValidatesLocalizedCopy;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $status = $this->input('status', 'draft');
        $publishing = in_array($status, ['published'], true);

        return array_merge(
            [
                'category_id' => [$publishing ? 'required' : 'nullable', 'exists:categories,id'],
                'brand_id' => [$publishing ? 'required' : 'nullable', 'exists:brands,id'],
                'slug' => ['nullable', 'string', 'max:190', 'unique:products,slug'],
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
                'specs.*.value' => ['required_with:specs', 'string', 'max:255'],
                'auto_translate' => ['nullable', 'boolean'],
                'source_locale' => ['nullable', 'string'],
            ],
            $this->localizedCopyRules('name', $publishing, 255),
            $this->localizedCopyRules('summary', false, 5000),
            $this->localizedCopyRules('notes', false, 5000),
            $this->localizedSpecLabelRules(),
        );
    }
}
