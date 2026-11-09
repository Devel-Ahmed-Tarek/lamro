<?php

namespace App\Support;

final class AdminPermissions
{
    public const ALL = [
        'admin.overview',
        'admin.features',
        'admin.cms',
        'admin.products',
        'admin.categories',
        'admin.brands',
        'admin.inventory',
        'admin.auctions',
        'admin.sellers',
        'admin.customers',
        'admin.staff',
        'admin.orders',
        'admin.payments',
        'admin.invoices',
        'admin.messages',
        'admin.reports',
        'admin.audit',
        'admin.shipping',
        'admin.commissions',
        'admin.notifications',
        'admin.system',
        'admin.profile',
    ];

    public const ROLE_MAP = [
        'super_admin' => self::ALL,
        'ops' => [
            'admin.overview',
            'admin.orders',
            'admin.payments',
            'admin.invoices',
            'admin.shipping',
            'admin.reports',
            'admin.audit',
            'admin.profile',
        ],
        'catalog' => [
            'admin.overview',
            'admin.products',
            'admin.categories',
            'admin.brands',
            'admin.inventory',
            'admin.auctions',
            'admin.profile',
        ],
        'support' => [
            'admin.overview',
            'admin.customers',
            'admin.messages',
            'admin.orders',
            'admin.profile',
        ],
    ];
}
