// Static-text localization for AnonSay. Only user-facing static copy lives here —
// the anonymous post itself, the posting ack, and /reveal /ban admin tooling stay in
// index.ts and are intentionally left in English (group-facing, or internal moderation).

export const LANGS = ["en", "ru", "es", "pt", "id", "de", "tr", "uk", "fa", "ar", "hi"] as const;
export type Lang = (typeof LANGS)[number];
export type Key =
  | "start"
  | "help"
  | "groupNudge"
  | "typeMessage"
  | "whichGroup"
  | "rateLimited"
  | "dailyLimitGroup"
  | "dailyLimitPrivate"
  | "emptyAfterFilter"
  | "aliasProOnly"
  | "proGroupInfo"
  | "proRunInGroup"
  | "proDescription"
  | "thankYou"
  | "btn_addToGroup"
  | "btn_addAnotherGroup"
  | "btn_shareBot"
  | "btn_unlockProStars";

/** ctx.from.language_code -> first two letters -> known table language, else "en". */
export function resolveLang(code?: string): Lang {
  const c = (code ?? "").slice(0, 2).toLowerCase();
  return (LANGS as readonly string[]).includes(c) ? (c as Lang) : "en";
}

/** Look up `key` for `lang` (falling back to English), substituting `{name}` tokens from `vars`. */
export function t(lang: string, key: Key, vars?: Record<string, string | number>): string {
  const l: Lang = (LANGS as readonly string[]).includes(lang) ? (lang as Lang) : "en";
  let s = TABLE[key][l] ?? TABLE[key].en;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

const TABLE: Record<Key, Record<Lang, string>> = {
  start: {
    en: "🎭 Say it in your group without your name on it.\nAdd me, then `/anon your message` — I delete yours and repost it as Anonymous.\nOr pick a group here and just type.\nFree: {free}/day per group · /help",
    ru: "🎭 Скажите это в своей группе без вашего имени.\nДобавьте меня, затем `/anon ваше сообщение` — я удалю ваше и опубликую заново как Anonymous.\nИли выберите группу здесь и просто пишите.\nБесплатно: {free}/день на группу · /help",
    es: "🎭 Dilo en tu grupo sin que aparezca tu nombre.\nAgrégame, luego `/anon tu mensaje` — elimino el tuyo y lo publico de nuevo como Anonymous.\nO elige un grupo aquí y solo escribe.\nGratis: {free}/día por grupo · /help",
    pt: "🎭 Diga no seu grupo sem seu nome aparecer.\nAdicione-me, depois `/anon sua mensagem` — apago a sua e republico como Anonymous.\nOu escolha um grupo aqui e só digite.\nGrátis: {free}/dia por grupo · /help",
    id: "🎭 Sampaikan di grupmu tanpa namamu ikut tercantum.\nTambahkan aku, lalu `/anon pesanmu` — pesanmu kuhapus dan kuposting ulang sebagai Anonymous.\nAtau pilih grup di sini dan langsung ketik.\nGratis: {free}/hari per grup · /help",
    de: "🎭 Sag es in deiner Gruppe, ohne dass dein Name dransteht.\nFüge mich hinzu, dann `/anon deine Nachricht` — ich lösche deine und poste sie neu als Anonymous.\nOder wähle hier eine Gruppe und tippe einfach los.\nKostenlos: {free}/Tag pro Gruppe · /help",
    tr: "🎭 Adın görünmeden grubunda söyle.\nBeni ekle, sonra `/anon mesajın` — seninkini silip Anonymous olarak yeniden paylaşırım.\nYa da burada bir grup seç ve yaz yeter.\nÜcretsiz: grup başına günde {free} · /help",
    uk: "🎭 Скажіть це у своїй групі без вашого імені.\nДодайте мене, потім `/anon ваше повідомлення` — я видалю ваше і опублікую заново як Anonymous.\nАбо оберіть групу тут і просто пишіть.\nБезкоштовно: {free}/день на групу · /help",
    fa: "🎭 حرفت را در گروهت بدون نامت بزن.\nمرا اضافه کن، سپس `/anon پیامت` — پیام تو را حذف و به‌عنوان Anonymous دوباره منتشر می‌کنم.\nیا همین‌جا یک گروه انتخاب کن و فقط تایپ کن.\nرایگان: {free}/روز برای هر گروه · /help",
    ar: "🎭 قل ما تريد في مجموعتك دون أن يظهر اسمك.\nأضفني، ثم `/anon رسالتك` — أحذف رسالتك وأعيد نشرها باسم Anonymous.\nأو اختر مجموعة هنا واكتب فقط.\nمجانًا: {free}/يوم لكل مجموعة · /help",
    hi: "🎭 अपना नाम बताए बिना अपने ग्रुप में कहें।\nमुझे जोड़ें, फिर `/anon आपका मैसेज` — मैं आपका मैसेज हटाकर Anonymous के रूप में फिर पोस्ट करता हूं।\nया यहां एक ग्रुप चुनें और बस टाइप करें।\nमुफ़्त: प्रति ग्रुप {free}/दिन · /help",
  },
  help: {
    en: "🎭 *AnonSay* posts your message into the group anonymously.\n\nIn a group: `/anon your message` — your message is deleted and reposted as “Anonymous”.\nIn private: /start, pick a group, then just type — it goes to that group anonymously.\n\nFree: {free} anonymous posts/day per group, {rate}/hour per person. Pro (one-time {stars} ⭐ per group): unlimited + a custom name via /alias — /pro",
    ru: "🎭 *AnonSay* публикует ваше сообщение в группе анонимно.\n\nВ группе: `/anon ваше сообщение` — сообщение удаляется и публикуется заново как «Anonymous».\nВ личке: /start, выберите группу, затем просто пишите — сообщение уйдёт туда анонимно.\n\nБесплатно: {free} анонимных постов/день на группу, {rate}/час на человека. Pro (разовый платёж {stars} ⭐ за группу): без ограничений + своё имя через /alias — /pro",
    es: "🎭 *AnonSay* publica tu mensaje en el grupo de forma anónima.\n\nEn un grupo: `/anon tu mensaje` — tu mensaje se elimina y se vuelve a publicar como “Anonymous”.\nEn privado: /start, elige un grupo, luego escribe — se enviará ahí de forma anónima.\n\nGratis: {free} publicaciones anónimas/día por grupo, {rate}/hora por persona. Pro (pago único de {stars} ⭐ por grupo): ilimitado + nombre personalizado con /alias — /pro",
    pt: "🎭 *AnonSay* publica sua mensagem no grupo de forma anônima.\n\nNo grupo: `/anon sua mensagem` — sua mensagem é apagada e republicada como “Anonymous”.\nNo privado: /start, escolha um grupo, depois só digite — vai para lá anonimamente.\n\nGrátis: {free} publicações anônimas/dia por grupo, {rate}/hora por pessoa. Pro (pagamento único de {stars} ⭐ por grupo): ilimitado + nome personalizado via /alias — /pro",
    id: "🎭 *AnonSay* memposting pesanmu ke grup secara anonim.\n\nDi grup: `/anon pesanmu` — pesanmu dihapus lalu diposting ulang sebagai “Anonymous”.\nDi privat: /start, pilih grup, lalu tinggal ketik — akan terkirim ke grup itu secara anonim.\n\nGratis: {free} postingan anonim/hari per grup, {rate}/jam per orang. Pro (sekali bayar {stars} ⭐ per grup): tanpa batas + nama kustom via /alias — /pro",
    de: "🎭 *AnonSay* postet deine Nachricht anonym in die Gruppe.\n\nIn einer Gruppe: `/anon deine Nachricht` — deine Nachricht wird gelöscht und als „Anonymous“ neu gepostet.\nPrivat: /start, Gruppe wählen, dann einfach tippen — es geht anonym an diese Gruppe.\n\nKostenlos: {free} anonyme Posts/Tag pro Gruppe, {rate}/Stunde pro Person. Pro (einmalig {stars} ⭐ pro Gruppe): unbegrenzt + eigener Name via /alias — /pro",
    tr: "🎭 *AnonSay* mesajını gruba anonim olarak gönderir.\n\nGrupta: `/anon mesajın` — mesajın silinir ve “Anonymous” olarak yeniden paylaşılır.\nÖzelde: /start, bir grup seç, sonra yazman yeterli — o gruba anonim olarak gider.\n\nÜcretsiz: grup başına günde {free} anonim gönderi, kişi başı saatte {rate}. Pro (grup başına tek seferlik {stars} ⭐): sınırsız + /alias ile özel isim — /pro",
    uk: "🎭 *AnonSay* публікує ваше повідомлення в групі анонімно.\n\nУ групі: `/anon ваше повідомлення` — повідомлення видаляється і публікується заново як «Anonymous».\nУ приваті: /start, оберіть групу, потім просто пишіть — піде туди анонімно.\n\nБезкоштовно: {free} анонімних постів/день на групу, {rate}/годину на людину. Pro (разовий платіж {stars} ⭐ за групу): без обмежень + власне ім'я через /alias — /pro",
    fa: "🎭 *AnonSay* پیام شما را به‌صورت ناشناس در گروه منتشر می‌کند.\n\nدر گروه: `/anon پیام شما` — پیام شما حذف و به‌عنوان «Anonymous» دوباره ارسال می‌شود.\nدر خصوصی: /start، یک گروه انتخاب کنید، سپس فقط تایپ کنید — به‌صورت ناشناس به آن گروه می‌رود.\n\nرایگان: {free} پست ناشناس در روز برای هر گروه، {rate} در ساعت برای هر نفر. Pro (پرداخت یک‌باره {stars} ⭐ برای هر گروه): نامحدود + نام سفارشی با /alias — /pro",
    ar: "🎭 *AnonSay* ينشر رسالتك في المجموعة بشكل مجهول.\n\nفي المجموعة: `/anon رسالتك` — تُحذف رسالتك وتُعاد نشرها باسم «Anonymous».\nفي الخاص: /start، اختر مجموعة، ثم اكتب فقط — ستُنشر هناك بشكل مجهول.\n\nمجانًا: {free} منشورًا مجهولًا/يوميًا لكل مجموعة، {rate}/ساعة لكل شخص. Pro (دفعة واحدة {stars} ⭐ لكل مجموعة): غير محدود + اسم مخصص عبر /alias — /pro",
    hi: "🎭 *AnonSay* आपका मैसेज ग्रुप में गुमनाम रूप से पोस्ट करता है।\n\nग्रुप में: `/anon आपका मैसेज` — आपका मैसेज हटा दिया जाता है और “Anonymous” के रूप में फिर से पोस्ट होता है।\nप्राइवेट में: /start करें, एक ग्रुप चुनें, फिर बस टाइप करें — यह उस ग्रुप में गुमनाम रूप से चला जाएगा।\n\nमुफ़्त: प्रति ग्रुप {free} गुमनाम पोस्ट/दिन, प्रति व्यक्ति {rate}/घंटा। Pro (प्रति ग्रुप एकमुश्त {stars} ⭐): असीमित + /alias से कस्टम नाम — /pro",
  },
  groupNudge: {
    en: "Add me to a group and use /anon there first. Then come back and I will let you post from here.",
    ru: "Сначала добавьте меня в группу и используйте там /anon. Затем вернитесь, и я разрешу вам постить отсюда.",
    es: "Agrégame a un grupo y usa /anon ahí primero. Luego vuelve y te dejaré publicar desde aquí.",
    pt: "Adicione-me a um grupo e use /anon lá primeiro. Depois volte e eu deixo você postar daqui.",
    id: "Tambahkan aku ke grup dan gunakan /anon di sana dulu. Lalu kembali lagi, aku akan izinkan kamu posting dari sini.",
    de: "Füge mich zuerst zu einer Gruppe hinzu und nutze dort /anon. Komm dann zurück, und ich lasse dich von hier aus posten.",
    tr: "Önce beni bir gruba ekle ve orada /anon kullan. Sonra buraya dön, buradan da paylaşmana izin vereceğim.",
    uk: "Спочатку додайте мене до групи і скористайтеся там /anon. Потім поверніться, і я дозволю постити звідси.",
    fa: "ابتدا مرا به یک گروه اضافه کنید و آنجا از /anon استفاده کنید. سپس برگردید تا اجازه دهم از اینجا پست کنید.",
    ar: "أضفني إلى مجموعة واستخدم /anon هناك أولًا. ثم عد إلى هنا وسأسمح لك بالنشر من هنا.",
    hi: "पहले मुझे किसी ग्रुप में जोड़ें और वहां /anon इस्तेमाल करें। फिर वापस आएं, मैं आपको यहां से पोस्ट करने दूंगा।",
  },
  typeMessage: {
    en: "Type your message. It will be posted anonymously to {group} right away.",
    ru: "Напишите сообщение. Оно будет сразу анонимно опубликовано в {group}.",
    es: "Escribe tu mensaje. Se publicará de forma anónima en {group} de inmediato.",
    pt: "Digite sua mensagem. Ela será publicada anonimamente em {group} imediatamente.",
    id: "Ketik pesanmu. Pesan akan langsung diposting secara anonim ke {group}.",
    de: "Tippe deine Nachricht. Sie wird sofort anonym in {group} gepostet.",
    tr: "Mesajını yaz. Hemen {group} grubuna anonim olarak gönderilecek.",
    uk: "Напишіть повідомлення. Воно буде одразу анонімно опубліковане в {group}.",
    fa: "پیام خود را تایپ کنید. بلافاصله به‌صورت ناشناس در {group} منتشر می‌شود.",
    ar: "اكتب رسالتك. ستُنشر بشكل مجهول في {group} فورًا.",
    hi: "अपना मैसेज टाइप करें। यह तुरंत {group} में गुमनाम रूप से पोस्ट हो जाएगा।",
  },
  whichGroup: {
    en: "Which group?",
    ru: "Какая группа?",
    es: "¿Qué grupo?",
    pt: "Qual grupo?",
    id: "Grup yang mana?",
    de: "Welche Gruppe?",
    tr: "Hangi grup?",
    uk: "Яка група?",
    fa: "کدام گروه؟",
    ar: "أي مجموعة؟",
    hi: "कौन सा ग्रुप?",
  },
  rateLimited: {
    en: "Slow down: {rate} anonymous posts per hour.",
    ru: "Помедленнее: {rate} анонимных постов в час.",
    es: "Más despacio: {rate} publicaciones anónimas por hora.",
    pt: "Mais devagar: {rate} publicações anônimas por hora.",
    id: "Pelan-pelan: {rate} postingan anonim per jam.",
    de: "Langsamer: {rate} anonyme Posts pro Stunde.",
    tr: "Yavaşla: saatte {rate} anonim gönderi.",
    uk: "Повільніше: {rate} анонімних постів на годину.",
    fa: "آرام‌تر: {rate} پست ناشناس در ساعت.",
    ar: "تمهّل: {rate} منشورًا مجهولًا في الساعة.",
    hi: "धीमे: प्रति घंटा {rate} गुमनाम पोस्ट।",
  },
  dailyLimitGroup: {
    en: "This group hit the free limit of {free} posts/day. Pro is unlimited (one-time {stars} ⭐).",
    ru: "Эта группа достигла бесплатного лимита в {free} постов/день. Pro без ограничений (разовый платёж {stars} ⭐).",
    es: "Este grupo alcanzó el límite gratuito de {free} publicaciones/día. Pro es ilimitado (pago único de {stars} ⭐).",
    pt: "Este grupo atingiu o limite grátis de {free} publicações/dia. Pro é ilimitado (pagamento único de {stars} ⭐).",
    id: "Grup ini mencapai batas gratis {free} postingan/hari. Pro tanpa batas (sekali bayar {stars} ⭐).",
    de: "Diese Gruppe hat das kostenlose Limit von {free} Posts/Tag erreicht. Pro ist unbegrenzt (einmalig {stars} ⭐).",
    tr: "Bu grup ücretsiz günlük {free} gönderi sınırına ulaştı. Pro sınırsızdır (tek seferlik {stars} ⭐).",
    uk: "Ця група досягла безкоштовного ліміту {free} постів/день. Pro без обмежень (разовий платіж {stars} ⭐).",
    fa: "این گروه به محدودیت رایگان {free} پست در روز رسیده است. Pro نامحدود است (پرداخت یک‌باره {stars} ⭐).",
    ar: "وصلت هذه المجموعة إلى الحد المجاني وهو {free} منشورًا/يوميًا. Pro غير محدود (دفعة واحدة {stars} ⭐).",
    hi: "इस ग्रुप ने मुफ़्त सीमा {free} पोस्ट/दिन पूरी कर ली है। Pro असीमित है (एकमुश्त {stars} ⭐)।",
  },
  dailyLimitPrivate: {
    en: "That group hit its free daily limit. Pro is unlimited (one-time {stars} ⭐).",
    ru: "Эта группа достигла своего бесплатного дневного лимита. Pro без ограничений (разовый платёж {stars} ⭐).",
    es: "Ese grupo alcanzó su límite diario gratuito. Pro es ilimitado (pago único de {stars} ⭐).",
    pt: "Aquele grupo atingiu seu limite diário grátis. Pro é ilimitado (pagamento único de {stars} ⭐).",
    id: "Grup itu mencapai batas harian gratisnya. Pro tanpa batas (sekali bayar {stars} ⭐).",
    de: "Diese Gruppe hat ihr kostenloses Tageslimit erreicht. Pro ist unbegrenzt (einmalig {stars} ⭐).",
    tr: "O grup ücretsiz günlük sınırına ulaştı. Pro sınırsızdır (tek seferlik {stars} ⭐).",
    uk: "Ця група досягла свого безкоштовного денного ліміту. Pro без обмежень (разовий платіж {stars} ⭐).",
    fa: "آن گروه به محدودیت رایگان روزانه‌اش رسیده است. Pro نامحدود است (پرداخت یک‌باره {stars} ⭐).",
    ar: "وصلت تلك المجموعة إلى حدها اليومي المجاني. Pro غير محدود (دفعة واحدة {stars} ⭐).",
    hi: "उस ग्रुप ने अपनी मुफ़्त दैनिक सीमा पूरी कर ली है। Pro असीमित है (एकमुश्त {stars} ⭐)।",
  },
  emptyAfterFilter: {
    en: "Nothing to post after removing links and mentions.",
    ru: "После удаления ссылок и упоминаний постить нечего.",
    es: "No queda nada que publicar después de quitar enlaces y menciones.",
    pt: "Nada a publicar depois de remover links e menções.",
    id: "Tidak ada yang bisa diposting setelah tautan dan mention dihapus.",
    de: "Nach dem Entfernen von Links und Erwähnungen bleibt nichts zum Posten übrig.",
    tr: "Bağlantılar ve bahsetmeler kaldırıldıktan sonra paylaşılacak bir şey kalmadı.",
    uk: "Після видалення посилань і згадок нічого постити.",
    fa: "پس از حذف لینک‌ها و منشن‌ها چیزی برای ارسال باقی نمانده است.",
    ar: "لا يوجد شيء لنشره بعد إزالة الروابط والإشارات.",
    hi: "लिंक और मेंशन हटाने के बाद पोस्ट करने के लिए कुछ नहीं बचा।",
  },
  aliasProOnly: {
    en: "A custom prefix is a Pro feature for this group.",
    ru: "Свой префикс — функция Pro для этой группы.",
    es: "Un prefijo personalizado es una función Pro para este grupo.",
    pt: "Um prefixo personalizado é um recurso Pro para este grupo.",
    id: "Prefiks kustom adalah fitur Pro untuk grup ini.",
    de: "Ein eigenes Präfix ist eine Pro-Funktion für diese Gruppe.",
    tr: "Özel bir önek bu grup için bir Pro özelliğidir.",
    uk: "Власний префікс — функція Pro для цієї групи.",
    fa: "پیشوند سفارشی یک ویژگی Pro برای این گروه است.",
    ar: "البادئة المخصصة ميزة Pro لهذه المجموعة.",
    hi: "कस्टम प्रीफ़िक्स इस ग्रुप के लिए Pro सुविधा है।",
  },
  proGroupInfo: {
    en: "Pro for this group: unlimited posts + /alias, one-time {stars} ⭐.",
    ru: "Pro для этой группы: неограниченные посты + /alias, разовый платёж {stars} ⭐.",
    es: "Pro para este grupo: publicaciones ilimitadas + /alias, pago único de {stars} ⭐.",
    pt: "Pro para este grupo: publicações ilimitadas + /alias, pagamento único de {stars} ⭐.",
    id: "Pro untuk grup ini: postingan tanpa batas + /alias, sekali bayar {stars} ⭐.",
    de: "Pro für diese Gruppe: unbegrenzte Posts + /alias, einmalig {stars} ⭐.",
    tr: "Bu grup için Pro: sınırsız gönderi + /alias, tek seferlik {stars} ⭐.",
    uk: "Pro для цієї групи: необмежені пости + /alias, разовий платіж {stars} ⭐.",
    fa: "Pro برای این گروه: پست‌های نامحدود + /alias، پرداخت یک‌باره {stars} ⭐.",
    ar: "Pro لهذه المجموعة: منشورات غير محدودة + /alias، دفعة واحدة {stars} ⭐.",
    hi: "इस ग्रुप के लिए Pro: असीमित पोस्ट + /alias, एकमुश्त {stars} ⭐।",
  },
  proRunInGroup: {
    en: "Run /pro inside the group you want to upgrade.",
    ru: "Запустите /pro внутри группы, которую хотите обновить.",
    es: "Ejecuta /pro dentro del grupo que quieres mejorar.",
    pt: "Execute /pro dentro do grupo que deseja atualizar.",
    id: "Jalankan /pro di dalam grup yang ingin kamu tingkatkan.",
    de: "Führe /pro in der Gruppe aus, die du upgraden möchtest.",
    tr: "Yükseltmek istediğin grubun içinde /pro çalıştır.",
    uk: "Запустіть /pro всередині групи, яку хочете оновити.",
    fa: "دستور /pro را داخل گروهی که می‌خواهید ارتقا دهید اجرا کنید.",
    ar: "شغّل /pro داخل المجموعة التي تريد ترقيتها.",
    hi: "जिस ग्रुप को अपग्रेड करना है, उसके अंदर /pro चलाएं।",
  },
  proDescription: {
    en: "Unlimited anonymous posts and a custom prefix instead of 'Anonymous'. One-time payment, no subscription.",
    ru: "Неограниченные анонимные посты и свой префикс вместо «Anonymous». Разовый платёж, без подписки.",
    es: "Publicaciones anónimas ilimitadas y un prefijo personalizado en lugar de 'Anonymous'. Pago único, sin suscripción.",
    pt: "Publicações anônimas ilimitadas e um prefixo personalizado em vez de 'Anonymous'. Pagamento único, sem assinatura.",
    id: "Postingan anonim tanpa batas dan prefiks kustom sebagai pengganti 'Anonymous'. Sekali bayar, tanpa langganan.",
    de: "Unbegrenzte anonyme Posts und ein eigenes Präfix statt 'Anonymous'. Einmalzahlung, kein Abo.",
    tr: "Sınırsız anonim gönderi ve 'Anonymous' yerine özel bir önek. Tek seferlik ödeme, abonelik yok.",
    uk: "Необмежені анонімні пости та власний префікс замість «Anonymous». Разовий платіж, без підписки.",
    fa: "پست‌های ناشناس نامحدود و پیشوندی سفارشی به‌جای 'Anonymous'. پرداخت یک‌باره، بدون اشتراک.",
    ar: "منشورات مجهولة غير محدودة وبادئة مخصصة بدلًا من 'Anonymous'. دفعة واحدة، بدون اشتراك.",
    hi: "असीमित गुमनाम पोस्ट और 'Anonymous' की जगह कस्टम प्रीफ़िक्स। एकमुश्त भुगतान, कोई सब्सक्रिप्शन नहीं।",
  },
  thankYou: {
    en: "✅ Pro unlocked for the group. Unlimited posts and /alias.\n\n/more — more free tools",
    ru: "✅ Pro активирован для группы. Неограниченные посты и /alias.\n\n/more — другие бесплатные инструменты",
    es: "✅ Pro activado para el grupo. Publicaciones ilimitadas y /alias.\n\n/more — más herramientas gratis",
    pt: "✅ Pro ativado para o grupo. Publicações ilimitadas e /alias.\n\n/more — mais ferramentas grátis",
    id: "✅ Pro aktif untuk grup. Postingan tanpa batas dan /alias.\n\n/more — alat gratis lainnya",
    de: "✅ Pro für die Gruppe freigeschaltet. Unbegrenzte Posts und /alias.\n\n/more — weitere kostenlose Tools",
    tr: "✅ Grup için Pro açıldı. Sınırsız gönderi ve /alias.\n\n/more — daha fazla ücretsiz araç",
    uk: "✅ Pro активовано для групи. Необмежені пости та /alias.\n\n/more — інші безкоштовні інструменти",
    fa: "✅ Pro برای گروه فعال شد. پست‌های نامحدود و /alias.\n\n/more — ابزارهای رایگان بیشتر",
    ar: "✅ تم تفعيل Pro للمجموعة. منشورات غير محدودة و/alias.\n\n/more — أدوات مجانية أخرى",
    hi: "✅ ग्रुप के लिए Pro अनलॉक हुआ। असीमित पोस्ट और /alias।\n\n/more — और मुफ़्त टूल्स",
  },
  btn_addToGroup: {
    en: "Add me to a group", ru: "Добавить в группу", es: "Añadirme a un grupo",
    pt: "Adicionar a um grupo", id: "Tambahkan ke grup", de: "Zu Gruppe hinzufügen",
    tr: "Gruba ekle", uk: "Додати до групи", fa: "افزودن به گروه",
    ar: "أضفني إلى مجموعة", hi: "ग्रुप में जोड़ें",
  },
  btn_addAnotherGroup: {
    en: "Add me to another group", ru: "Добавить в другую группу", es: "Añadirme a otro grupo",
    pt: "Adicionar a outro grupo", id: "Tambahkan ke grup lain", de: "Zu anderer Gruppe hinzufügen",
    tr: "Başka gruba ekle", uk: "Додати до іншої групи", fa: "افزودن به گروه دیگر",
    ar: "أضفني إلى مجموعة أخرى", hi: "दूसरे ग्रुप में जोड़ें",
  },
  btn_shareBot: {
    en: "Share this bot", ru: "Поделиться ботом", es: "Compartir este bot",
    pt: "Compartilhar este bot", id: "Bagikan bot ini", de: "Bot teilen",
    tr: "Botu paylaş", uk: "Поділитися ботом", fa: "اشتراک‌گذاری ربات",
    ar: "شارك هذا البوت", hi: "यह बॉट शेयर करें",
  },
  btn_unlockProStars: {
    en: "Unlock Pro, {stars} ⭐", ru: "Купить Pro, {stars} ⭐", es: "Desbloquear Pro, {stars} ⭐",
    pt: "Desbloquear Pro, {stars} ⭐", id: "Buka Pro, {stars} ⭐", de: "Pro freischalten, {stars} ⭐",
    tr: "Pro'yu aç, {stars} ⭐", uk: "Купити Pro, {stars} ⭐", fa: "باز کردن Pro، {stars} ⭐",
    ar: "فتح Pro، {stars} ⭐", hi: "Pro अनलॉक करें, {stars} ⭐",
  },
};
