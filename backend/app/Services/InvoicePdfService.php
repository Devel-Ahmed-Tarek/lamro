<?php

namespace App\Services;

use App\Models\Invoice;
use Dompdf\Dompdf;
use Dompdf\Options;

class InvoicePdfService
{
    public function render(Invoice $invoice): string
    {
        $snap = $invoice->snapshot ?? [];
        $seller = $snap['seller'] ?? [];
        $customer = $snap['customer'] ?? [];
        $items = $snap['items'] ?? [];
        $currency = $snap['currency'] ?? 'EUR';

        $rows = '';
        foreach ($items as $item) {
            $name = is_array($item['name'] ?? null)
                ? ($item['name']['en'] ?? $item['name']['de'] ?? 'Item')
                : ($item['name'] ?? 'Item');
            $rows .= '<tr>'
                .'<td>'.htmlspecialchars((string) $name, ENT_QUOTES, 'UTF-8').'</td>'
                .'<td>'.(int) ($item['qty'] ?? 0).'</td>'
                .'<td>'.number_format((float) ($item['unit_price'] ?? 0), 2).'</td>'
                .'<td>'.number_format((float) ($item['line_total'] ?? 0), 2).'</td>'
                .'</tr>';
        }

        $html = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>
            body{font-family: DejaVu Sans, sans-serif;font-size:12px;color:#111}
            h1{font-size:20px;margin:0 0 8px}
            table{width:100%;border-collapse:collapse;margin-top:16px}
            th,td{border:1px solid #ccc;padding:6px;text-align:left}
            .muted{color:#666}
        </style></head><body>
            <h1>Invoice '.htmlspecialchars($invoice->number, ENT_QUOTES, 'UTF-8').'</h1>
            <p class="muted">Issued '.$invoice->issued_at?->toDateString().' · Order '.htmlspecialchars((string) ($snap['order_number'] ?? ''), ENT_QUOTES, 'UTF-8').'</p>
            <p><strong>Seller</strong><br>'.htmlspecialchars((string) ($seller['name'] ?? 'Jala'), ENT_QUOTES, 'UTF-8').'<br>'.htmlspecialchars((string) ($seller['address'] ?? ''), ENT_QUOTES, 'UTF-8').'<br>VAT '.htmlspecialchars((string) ($seller['vat_id'] ?? ''), ENT_QUOTES, 'UTF-8').'</p>
            <p><strong>Bill to</strong><br>'.htmlspecialchars((string) ($customer['name'] ?? ''), ENT_QUOTES, 'UTF-8').'<br>'.htmlspecialchars((string) ($customer['company'] ?? ''), ENT_QUOTES, 'UTF-8').'<br>'.htmlspecialchars((string) ($customer['email'] ?? ''), ENT_QUOTES, 'UTF-8').'</p>
            <table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead><tbody>'.$rows.'</tbody></table>
            <p>Subtotal: '.number_format($invoice->subtotal, 2).' '.$currency.'<br>
            Tax ('.number_format($invoice->tax_rate_bps / 100, 2).'%): '.number_format($invoice->tax, 2).'<br>
            <strong>Total: '.number_format($invoice->total, 2).' '.$currency.'</strong></p>
            <p class="muted">Bank: '.htmlspecialchars((string) ($seller['iban'] ?? ''), ENT_QUOTES, 'UTF-8').' · BIC '.htmlspecialchars((string) ($seller['bic'] ?? ''), ENT_QUOTES, 'UTF-8').'</p>
        </body></html>';

        $options = new Options;
        $options->set('isRemoteEnabled', false);
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('A4');
        $dompdf->render();

        return $dompdf->output();
    }
}
