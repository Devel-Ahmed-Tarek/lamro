<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['slug' => 'drives', 'name' => ['de' => 'Antriebe & Umrichter', 'en' => 'Drives & inverters'], 'sort' => 1],
            ['slug' => 'plc', 'name' => ['de' => 'Steuerungen', 'en' => 'PLCs'], 'sort' => 2],
            ['slug' => 'hmi', 'name' => ['de' => 'Bedienpanels', 'en' => 'HMI panels'], 'sort' => 3],
            ['slug' => 'switchgear', 'name' => ['de' => 'Schaltgeräte', 'en' => 'Switchgear'], 'sort' => 4],
            ['slug' => 'servo', 'name' => ['de' => 'Servo & CNC', 'en' => 'Servo & CNC'], 'sort' => 5],
            ['slug' => 'spares', 'name' => ['de' => 'Ersatzteile', 'en' => 'Spare parts'], 'sort' => 6],
        ];

        foreach ($categories as $category) {
            Category::query()->updateOrCreate(['slug' => $category['slug']], $category + ['is_active' => true]);
        }

        foreach (['Siemens', 'ABB', 'Schneider Electric', 'Allen-Bradley', 'Fanuc', 'Lenze'] as $brandName) {
            Brand::query()->updateOrCreate(
                ['slug' => Str::slug($brandName)],
                ['name' => $brandName, 'is_active' => true],
            );
        }

        $products = [
            [
                'slug' => 'sinamics-g120c',
                'category' => 'drives',
                'brand' => 'Siemens',
                'name' => ['de' => 'SINAMICS G120C Umrichter', 'en' => 'SINAMICS G120C drive'],
                'summary' => ['de' => 'Kompakter Frequenzumrichter für Pumpen, Lüfter und Fördertechnik.', 'en' => 'Compact frequency drive for pumps, fans, and conveyors.'],
                'notes' => ['de' => 'Leichte Gebrauchsspuren am Gehäuse. Lüfter frei, keine Fehlermeldungen im Testlauf.', 'en' => 'Light housing marks. Fan clear, no faults during the test run.'],
                'part_number' => '6SL3210-1KE21-3AF2',
                'model' => 'G120C',
                'sku' => 'JALA-DRV-1044',
                'serial' => 'SZN9K44120',
                'condition' => 'used',
                'testing' => 'tested',
                'price' => 640,
                'stock' => 4,
                'weight' => '3.8 kg',
                'dimensions' => '230 × 150 × 170 mm',
                'specs' => [
                    ['label' => ['de' => 'Leistung', 'en' => 'Power'], 'value' => '5.5 kW'],
                    ['label' => ['de' => 'Versorgung', 'en' => 'Supply'], 'value' => '3 AC 380–480 V'],
                    ['label' => ['de' => 'Filter', 'en' => 'Filter'], 'value' => 'Class A'],
                ],
            ],
            [
                'slug' => 's7-1515',
                'category' => 'plc',
                'brand' => 'Siemens',
                'name' => ['de' => 'SIMATIC S7-1500 CPU 1515-2 PN', 'en' => 'SIMATIC S7-1500 CPU 1515-2 PN'],
                'summary' => ['de' => 'Zentrale Steuerung mit zwei Profinet-Schnittstellen.', 'en' => 'Central controller with two PROFINET interfaces.'],
                'notes' => ['de' => 'Werkseitig zurückgesetzt. Speicherkarte nicht enthalten.', 'en' => 'Factory reset. Memory card not included.'],
                'part_number' => '6ES7515-2AM02-0AB0',
                'model' => 'CPU 1515-2 PN',
                'sku' => 'JALA-PLC-2201',
                'serial' => 'SVP441908',
                'condition' => 'refurbished',
                'testing' => 'tested',
                'price' => 1890,
                'stock' => 2,
                'weight' => '0.9 kg',
                'dimensions' => '147 × 35 × 129 mm',
                'specs' => [
                    ['label' => ['de' => 'Arbeitsspeicher', 'en' => 'Work memory'], 'value' => '500 KB Program / 3 MB Data'],
                    ['label' => ['de' => 'Schnittstellen', 'en' => 'Interfaces'], 'value' => '2× PROFINET'],
                ],
            ],
            [
                'slug' => 'acs580',
                'category' => 'drives',
                'brand' => 'ABB',
                'name' => ['de' => 'ACS580 Frequenzumrichter', 'en' => 'ACS580 frequency drive'],
                'summary' => ['de' => 'ABB Standardumrichter mit Schaltschrankmontage.', 'en' => 'ABB standard drive for cabinet mounting.'],
                'notes' => ['de' => 'Laut Verkäufer im Betrieb gelaufen. Nicht erneut auf dem Prüfstand.', 'en' => 'Ran in service according to the seller. Not retested on our bench.'],
                'part_number' => 'ACS580-01-012A-4',
                'model' => 'ACS580-01',
                'sku' => 'JALA-DRV-1180',
                'serial' => '—',
                'condition' => 'used',
                'testing' => 'working',
                'price' => 720,
                'stock' => 3,
                'weight' => '6.1 kg',
                'dimensions' => '400 × 125 × 220 mm',
                'specs' => [
                    ['label' => ['de' => 'Nennstrom', 'en' => 'Rated current'], 'value' => '12 A'],
                    ['label' => ['de' => 'Schutzart', 'en' => 'Protection'], 'value' => 'IP21'],
                ],
            ],
            [
                'slug' => 'ktp700',
                'category' => 'hmi',
                'brand' => 'Siemens',
                'name' => ['de' => 'SIMATIC KTP700 Basic', 'en' => 'SIMATIC KTP700 Basic'],
                'summary' => ['de' => '7-Zoll-Panel mit Touch und Tasten für Basisanwendungen.', 'en' => '7-inch panel with touch and keys for basic applications.'],
                'notes' => ['de' => 'Eine Folientaste hakt. Touch und Anzeige geprüft.', 'en' => 'One membrane key sticks. Touch and display tested.'],
                'part_number' => '6AV2123-2GA03-0AX0',
                'model' => 'KTP700 Basic',
                'sku' => 'JALA-HMI-3310',
                'serial' => 'SPN22014',
                'condition' => 'used',
                'testing' => 'partial',
                'price' => 410,
                'stock' => 1,
                'weight' => '0.8 kg',
                'dimensions' => '214 × 158 × 45 mm',
                'specs' => [
                    ['label' => ['de' => 'Display', 'en' => 'Display'], 'value' => '7" TFT'],
                    ['label' => ['de' => 'Schnittstelle', 'en' => 'Interface'], 'value' => 'PROFINET'],
                ],
            ],
            [
                'slug' => 'lc1d25',
                'category' => 'switchgear',
                'brand' => 'Schneider Electric',
                'name' => ['de' => 'TeSys D Schütz', 'en' => 'TeSys D contactor'],
                'summary' => ['de' => 'Leistungsschütz für Motorabgänge bis 25 A.', 'en' => 'Power contactor for motor feeders up to 25 A.'],
                'notes' => ['de' => 'Originalverpackt. Spule 24 V DC.', 'en' => 'Original packaging. 24 V DC coil.'],
                'part_number' => 'LC1D25BD',
                'model' => 'LC1D25',
                'sku' => 'JALA-SWG-0902',
                'serial' => '—',
                'condition' => 'new',
                'testing' => 'tested',
                'price' => 86,
                'stock' => 18,
                'weight' => '0.37 kg',
                'dimensions' => '85 × 45 × 90 mm',
                'specs' => [
                    ['label' => ['de' => 'Bemessungsstrom', 'en' => 'Rated current'], 'value' => '25 A AC-3'],
                    ['label' => ['de' => 'Spule', 'en' => 'Coil'], 'value' => '24 V DC'],
                ],
            ],
            [
                'slug' => 'powerflex',
                'category' => 'drives',
                'brand' => 'Allen-Bradley',
                'name' => ['de' => 'PowerFlex 753 Umrichter', 'en' => 'PowerFlex 753 drive'],
                'summary' => ['de' => 'Modularer Umrichter für anspruchsvolle Antriebsaufgaben.', 'en' => 'Modular drive for demanding motor control.'],
                'notes' => ['de' => 'Aus Anlagenrückbau. Kein Funktionstest durchgeführt.', 'en' => 'Removed from a decommissioned line. No functional test performed.'],
                'part_number' => '20F1ANC205JN0NNNNN',
                'model' => 'PowerFlex 753',
                'sku' => 'JALA-DRV-1412',
                'serial' => 'ABPF753992',
                'condition' => 'used',
                'testing' => 'untested',
                'price' => 1540,
                'stock' => 1,
                'weight' => '12.4 kg',
                'dimensions' => '400 × 220 × 250 mm',
                'specs' => [
                    ['label' => ['de' => 'Norm', 'en' => 'Rating'], 'value' => 'ND 20 Hp'],
                    ['label' => ['de' => 'Gehäuse', 'en' => 'Enclosure'], 'value' => 'IP20'],
                ],
            ],
            [
                'slug' => 'fanuc-servo',
                'category' => 'servo',
                'brand' => 'Fanuc',
                'name' => ['de' => 'Fanuc Servoverstärker', 'en' => 'Fanuc servo amplifier'],
                'summary' => ['de' => 'Achsverstärker für Fanuc CNC-Maschinen.', 'en' => 'Axis amplifier for Fanuc CNC machines.'],
                'notes' => ['de' => 'Kondensatoren geprüft, Lüfter ersetzt.', 'en' => 'Capacitors checked, fan replaced.'],
                'part_number' => 'A06B-6079-H106',
                'model' => 'SVM1-40',
                'sku' => 'JALA-SRV-0771',
                'serial' => 'FNC18820',
                'condition' => 'refurbished',
                'testing' => 'tested',
                'price' => 980,
                'stock' => 2,
                'weight' => '4.6 kg',
                'dimensions' => '380 × 90 × 300 mm',
                'specs' => [
                    ['label' => ['de' => 'Achse', 'en' => 'Axis'], 'value' => '1-axis'],
                    ['label' => ['de' => 'Eingang', 'en' => 'Input'], 'value' => '283–325 V DC'],
                ],
            ],
            [
                'slug' => 'lenze-i550',
                'category' => 'spares',
                'brand' => 'Lenze',
                'name' => ['de' => 'Lenze i550 Schaltschrankgerät', 'en' => 'Lenze i550 cabinet inverter'],
                'summary' => ['de' => 'Kompakter Umrichter für Serienmaschinen.', 'en' => 'Compact inverter for series machines.'],
                'notes' => ['de' => 'Fehler F05 nach dem Einschalten. Verkauf nur als Ersatzteilspender.', 'en' => 'Fault F05 on power-up. Sold for parts only.'],
                'part_number' => 'I55AE125F1',
                'model' => 'i550',
                'sku' => 'JALA-SPR-0550',
                'serial' => '—',
                'condition' => 'parts',
                'testing' => 'defective',
                'price' => 190,
                'stock' => 1,
                'weight' => '2.2 kg',
                'dimensions' => '200 × 120 × 160 mm',
                'specs' => [
                    ['label' => ['de' => 'Leistung', 'en' => 'Power'], 'value' => '0.55 kW'],
                    ['label' => ['de' => 'Phasen', 'en' => 'Phases'], 'value' => '1 AC 230 V'],
                ],
            ],
        ];

        foreach ($products as $index => $item) {
            $category = Category::query()->where('slug', $item['category'])->firstOrFail();
            $brand = Brand::query()->where('name', $item['brand'])->firstOrFail();

            $product = Product::query()->updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'name' => $item['name'],
                    'summary' => $item['summary'],
                    'notes' => $item['notes'],
                    'part_number' => $item['part_number'],
                    'model' => $item['model'],
                    'sku' => $item['sku'],
                    'serial' => $item['serial'],
                    'condition' => $item['condition'],
                    'testing' => $item['testing'],
                    'price_cents' => (int) round($item['price'] * 100),
                    'total_stock' => $item['stock'],
                    'reserved_auction' => $item['slug'] === 'sinamics-g120c' ? 2 : 0,
                    'reserved_order' => $item['slug'] === 'sinamics-g120c' ? 1 : 0,
                    'weight' => $item['weight'],
                    'dimensions' => $item['dimensions'],
                    'status' => 'published',
                    'allow_cart' => true,
                    'allow_buy_now' => true,
                    'allow_offer' => true,
                    'allow_quote' => true,
                    'allow_inquiry' => true,
                ],
            );

            $product->specs()->delete();
            foreach ($item['specs'] as $sort => $spec) {
                $product->specs()->create([
                    'label' => $spec['label'],
                    'value' => $spec['value'],
                    'sort' => $sort,
                ]);
            }
        }
    }
}
