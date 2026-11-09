<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TaxSetting extends Model
{
    protected $fillable = [
        'rate_bps',
        'currency',
        'company_name',
        'company_address',
        'vat_id',
        'bank_iban',
        'bank_bic',
        'bank_name',
    ];

    public static function current(): self
    {
        return static::query()->first() ?? static::query()->create([
            'rate_bps' => 1900,
            'currency' => 'EUR',
            'company_name' => 'Jala',
            'bank_iban' => 'DE89 3704 0044 0532 0130 00',
            'bank_bic' => 'COBADEFFXXX',
            'bank_name' => 'Commerzbank',
        ]);
    }
}
