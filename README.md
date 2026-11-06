# @checkout-uz/checkout-sdk-ts

[CHECKOUT.UZ](https://checkout.uz) merchant API'si uchun rasmiy TypeScript kutubxonasi — to'liq tip xavfsizligi bilan, bitta paket orqali **v1** va **v2** versiyalarining ikkalasiga ham kirish imkoni.

```ts
import { CheckoutClient } from "@checkout-uz/checkout-sdk-ts";

const client = new CheckoutClient("kassangizning_api_kaliti");
const payment = await client.v2.createPayment({ amount: 50000, description: "Buyurtma #1" });
console.log(payment.payment._url); // shu havolani mijozga yuboring
```

## O'rnatish

Hozircha npm'da emas — to'g'ridan-to'g'ri GitHub'dan o'rnating:

```bash
npm install github:checkout-uz/checkout-sdk-ts
```

Talab: **Node.js >= 18** (o'rnatilgan `fetch`'dan foydalanadi, tashqi HTTP kutubxonasi shart emas).

## API kalitini qayerdan olish mumkin

1. [checkout.uz](https://checkout.uz)ga kiring → **Kassalar** → kerakli kassani oching → **Sozlamalar**.
2. U yerda ko'rsatilgan **API KEY**ni nusxalang.
3. Bu kalitni hech kimga bermang — faqat server tomonida (backend) ishlating, hech qachon brauzer/mobil ilova kodiga yozmang.

## Tezkor boshlash

```ts
import { CheckoutClient, CheckoutApiError } from "@checkout-uz/checkout-sdk-ts";

const client = new CheckoutClient("kassangizning_api_kaliti");

try {
  const payment = await client.v2.createPayment({
    amount: 50000,                  // so'mda, 1000 - 10 000 000 oralig'ida
    description: "Buyurtma #1",
    expireTime: 3600,               // ixtiyoriy, soniyada, standart 1 soat
  });
  console.log(payment.payment._url);    // mijozni shu to'lov sahifasiga yo'naltiring
  console.log(payment.payment._uuid);   // buni saqlab qo'ying - to'lovning doimiy ID'si
} catch (e) {
  if (e instanceof CheckoutApiError) {
    console.error(`Xatolik (${e.statusCode}): ${e.message}`);
  }
}
```

Mijoz to'lov qilgandan keyin, checkout.uz sizning `webhookUrl`'ingizga xabar yuboradi (agar sozlagan bo'lsangiz) — yoki `statusPayment` orqali o'zingiz tekshirishingiz mumkin:

```ts
const status = await client.v2.statusPayment({ uuid: payment.payment._uuid });
console.log(status.data.status); // "pending" / "paid" / "canceled" / "reversed"
```

## v1 va v2 farqi

Ikkalasi ham bitta client'da mavjud:

```ts
await client.v1.createPayment({ amount: 50000 });
await client.v2.createPayment({ amount: 50000, expireTime: 7200, idempotencyKey: "order-42" });
```

v2 v1'ning hamma imkoniyatlari ustiga quyidagilarni qo'shadi:

- `idempotencyKey` (`createPayment`da) — xavfsiz qayta urinish: shu kalit bilan 24 soat ichida qayta so'ralsa, yangi invoys ochilmaydi, eskisi qaytariladi
- `expireTime` — invoys qancha vaqt ochiq turishini belgilash
- `getHistory({ offset, status, dateFrom, dateTo })` — sahifalash va filtrlash
- `getStats()` — endi `by_provider` (to'lov tizimi bo'yicha) taqsimot bilan
- `cancelPayment({ orderId })` — hali "kutilmoqda" holatidagi invoysni bekor qilish
- `refundPayment({ orderId })` — muvaffaqiyatli to'lovni qaytarish
- `getFiscal({ orderId })` — Payme/Click/Plum to'lovlari uchun fiskal chekni olish

`payViaCard`/`confirmCardPayment` ikkala versiyada ham bir xil ishlaydi.

## Hisob darajasidagi metodlar (`ProfileClient`)

`getProfile`/`getShops`/`getProfileStats` — bitta kassaga emas, butun hisobingizga tegishli, alohida *profil API kaliti* bilan ishlaydi:

```ts
import { ProfileClient } from "@checkout-uz/checkout-sdk-ts";

const profile = new ProfileClient("profil_api_kalitingiz");
const shops = await profile.getShops();
const stats = await profile.getProfileStats({ dateFrom: "2026-01-01" });
```

## Xatoliklarni qayta ishlash

Har bir metod muvaffaqiyatsizlikda `CheckoutApiError` chiqaradi (`statusCode`, `message`, `response` maydonlari bilan):

```ts
import { CheckoutApiError } from "@checkout-uz/checkout-sdk-ts";

try {
  await client.v2.refundPayment({ orderId: 123 });
} catch (e) {
  if (e instanceof CheckoutApiError) {
    console.log(e.statusCode, e.message);
  }
}
```

## To'liq API hujjatlari

- v1: https://checkout.uz/api-docs/v1
- v2: https://checkout.uz/api-docs/v2

## Ishlab chiqish (development)

```bash
npm install
npm test
```

Barcha testlar `fetch`ni soxtalashtiradi (mock) — hech biri haqiqiy checkout.uz API'siga murojaat qilmaydi.

## Litsenziya

MIT
