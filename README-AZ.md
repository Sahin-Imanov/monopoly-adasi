# Monopoli · Dörd Ada (onlayn)

2–6 nəfərlik Monopoli və eyni otağa qoşulmuş oyunçular üçün dörd 3D mini oyun:
**Lazer adası, Lava adası, Top adası, Mayın adası.** Mini oyunlarda kompüter rəqibləri əlavə edilmir. Mayın adasının 6 meydanından iştirakçı sayına uyğun fərqli meydanlar təsadüfi seçilir.

## Başlatmaq

Node.js 22 və ya 24 ilə:

```sh
npm ci
npm start
```

Brauzerdə `http://localhost:3000` açın. Host otaq yaradır, digərləri dəvət linki və ya otaq kodu ilə qoşulur. Telefonda faylı birbaşa açmaq əvəzinə serverin HTTPS ünvanını istifadə edin. Render üçün `render.yaml` paketə daxildir: mövcud Git repozitoriyanızdakı faylları bu paketlə yeniləyin; Web Service üçün Build Command `npm ci`, Start Command `npm start`, Health Check `/healthz` olsun. Bütün `public/` qovluğu, `server.cjs`, `mini-engine.cjs`, `package.json` və `package-lock.json` birlikdə yerləşdirilməlidir. Təkcə HTML-i dəyişmək kifayət etmir.

## Otaq seçimləri

- Mini oyunları tam aktiv/deaktiv etmək və hər adanı ayrıca seçmək olar.
- Host N sayını seçir: hər N adi Monopoli zərindən sonra növbənin uyğun keçidində təsadüfi seçilmiş ada açılır. Başlanğıc sırası üçün atılan zərlər bu saya daxil deyil.
- Host 1–6-cı yerlərin hər birinin pul mükafatını otaqda təyin edir. **Seçimləri saxla** düyməsi ilə saxlayın.
- Standart: hər 5 zərdən bir; mükafatlar 300 / 150 / 75 / 25 / 0 / 0 $.
- Bərabər yerlər müsabiqə qaydası ilə hesablanır: 1, 1, 3 və ya 1, 1, 1, 4. Bərabər yerdə olanların hər biri həmin yerin tam mükafatını alır.

## Oyun axını

1. Başlanğıcda hamı iki zər atır. Cəmi böyük olan əvvəl başlayır. Eyni nəticə alan qruplar fərqlənənə qədər yalnız öz aralarında təkrar atırlar.
2. Monopoli davam edir. Seçilmiş aralıqda zolaqlı soldan-sağa keçidlə ada açılır.
3. Adanın **Hazıram** ekranında bütün iştirakçılar təsdiq verir, sonra ortaq 3 saniyəlik geri sayım başlayır.
4. Server hərəkətləri, zərbələri, canları və nəticələri hesablayır. Telefonlar yalnız idarəetməni göndərir.
5. Sonda hamının yeri və mükafatı göstərilir. Hamı **Monopoliyə qayıt** düyməsinə basdıqda (və ya nəticə ekranının 45 saniyəlik müddəti bitdikdə) lövhəyə qayıdılır.
6. Mükafat yalnız bir dəfə verilir. Birinci olanların adının yanında 🏆 görünür. Statistika və yekun ekranda hər oyunçunun mini oyun qələbələri və toplam mini oyun qazancı göstərilir.

## İdarəetmə və qaydalar

- **Lazer:** WASD / oxlar; boşluqla tullanma, basılı saxlayanda havada süzülmə. Telefonda hərəkət dairəsi və tullanma düyməsi. 3 can, hər zərbədə −1. 14 dalğa.
- **Lava:** WASD; siçanla nişan və basılı saxlayaraq atəş. Telefonda ekranın sol yarısı hərəkət, sağ yarısı nişan/atəşdir; dairələr toxunduğunuz yerdə yaranır və buraxanda yox olur. Tullanma yoxdur. 20 can, atəş −2, lava ilk toxunuşda −2, sonra hər saniyə −2; atəş zərbəsi 3 vahid geri sürüşdürür və yarım saniyəlik yıxılma verir. Sahə hər 7 saniyədə daralır.
- **Top:** WASD və ya dairəvi mobil idarəetmə. Dairədən kənara çıxmaq olmur. Başlanğıc mərmi aralığı 1 saniyə, son səviyyədə 0.3 saniyə. 3 can.
- **Mayın:** WASD / oxlar. Mobil solda yuxarı/aşağı, sağda sol/sağ. Hər oxun icra müddətində yalnız **bir** hərəkət haqqı var; əlavə basışlar qəbul edilmir. Baş üstündəki oxlar yanıb-sönür, hər kəsin ardıcıllığı ayrıdır. 10 raund; göstərilmə sürəti 100%-dən 200%-ə yüksəlir. Kamera bütün meydanları göstərir. Külək səsi ilkin səviyyədən 70% azdır.

Telefonun şaquli görünüşündə lövhə yuxarıdadır. Kartlar aşağı soldadır; onların üstündəki **Əməliyyatlar** çubuğu açılıb-bağlanır. Tikinti, ipoteka, mübadilə və iflas həmin menyudadır. Söhbət düyməsi aşağı sağdadır. 12 fiqur ifadəsi otaqda seçilir.

## Yoxlama

```sh
npm test
```

Sınaqlar: real WebSocket bağlantıları, otaq izolyasiyası, ortaq hazır/geri sayım/nəticə, başlanğıc zər bərabərliyi, 2/4/6 iştirakçı, təsadüfi mayın meydanları, 10 raund, bir hərəkət limiti, zərər və geri itələmə, bərabər yerlər, mükafatın təkrar verilməməsi, Monopoliyə qayıdış.

## İşlətmə qeydi

Bu paket canlı sayta avtomatik yerləşdirilmir; onlayn oynamaq üçün Node serverini yerləşdirmək lazımdır. Bir server prosesi/instansiya istifadə edin. Otaqlar, davam edən oyun və adalar serverin yaddaşındadır; server yenidən başladıqda sıfırlanır. Brauzerin bağlantısı qısa kəsilərsə eyni otağa, eyni cihazdan qayıdın. Mini oyun başlamazdan əvvəl bütün iştirakçılar hazır olmalıdır. Yerli kompüter/bir cihaz test rejimində adalar söndürülür; adalar ayrı cihazlarla onlayn otaqlar üçündür.

Three.js MIT lisenziyaları `public/islands/*/licenses` daxilindədir. Xarici CDN tələb olunmur.
