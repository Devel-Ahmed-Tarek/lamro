<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

#[Fillable([
    'name',
    'email',
    'password',
    'phone',
    'avatar_path',
    'is_active',
    'two_factor_enabled',
    'two_factor_secret',
    'account_type',
    'company_name',
    'vat_id',
    'country',
])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasRoles, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
            'two_factor_enabled' => 'boolean',
        ];
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(Address::class);
    }

    public function avatarUrl(): ?string
    {
        if (! $this->avatar_path) {
            return null;
        }

        return url('/storage/'.$this->avatar_path);
    }

    public function isStaff(): bool
    {
        return $this->hasAnyRole(['super_admin', 'ops', 'catalog', 'support']);
    }

    public function isCustomer(): bool
    {
        return $this->hasRole('customer');
    }

    public function auctionApplications(): HasMany
    {
        return $this->hasMany(AuctionApplication::class);
    }

    public function bids(): HasMany
    {
        return $this->hasMany(Bid::class);
    }
}
