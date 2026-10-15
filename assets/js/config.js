/* =========================================================
   IMIN guest page: content that changes from night to night.
   Edit this file only; the page renders from it.
   ========================================================= */
window.IMIN = {
  /* Hero state:
     'A' = a published upcoming night
     'B' = no date yet
     'C' = up to 7 days after the last night
     'auto' = A if there is an upcoming night, C within 7 days of the last one, otherwise B */
  state: 'auto',

  /* Is the visitor near the next night (~100 km)? Set by the server
     from the IP, never stored. false = no sticky bar on phones. */
  inRegion: true,

  links: {
    create: 'pro/',                                  // page for creators
    signIn: 'https://app.imin.wtf/',                 // guest account
    creatorSignIn: 'https://dashboard.imin.wtf/',     // "Already creating? Sign in"
    allNights: 'https://app.imin.wtf/events',
    channel: 'https://www.instagram.com/imin.wtf/',   // TODO: the "I'm in" broadcast channel link
    instagram: 'https://www.instagram.com/imin.wtf/',
    threads: 'https://www.threads.net/@imin.wtf',
    tiktok: '',                                       // shown once it is active
    playlist: '',                                     // TODO: Spotify "Friday playlist" link
    privacy: 'https://app.imin.wtf/legal/privacy',
    legal: {
      'Legal notice': 'https://app.imin.wtf/legal/notice',
      'Terms': 'https://app.imin.wtf/legal/terms',
      'Privacy': 'https://app.imin.wtf/legal/privacy',
      'Refunds': 'https://app.imin.wtf/legal/refunds',
      'Cookies': 'https://app.imin.wtf/legal/cookies'
    }
  },

  /* Creators page (pro/). Empty = not ready yet: the page hides that channel or falls back to the form. */
  pro: {
    links: {
      signUp: 'https://dashboard.imin.wtf/signup',    // TODO: the dashboard sign-up URL (CREATE YOUR NIGHT, Sign up)
      signIn: 'https://dashboard.imin.wtf/',           // SIGN IN
      nights: '../',                                   // the guest page
      instagramCreators: 'https://www.instagram.com/imin.wtf/', // TODO: @imin.pro or the creators account once it exists
      instagram: 'https://www.instagram.com/imin.wtf/',
      whatsapp: '',                                    // TODO: https://wa.me/<Bohdan's number>
      telegram: '',                                    // TODO: https://t.me/<username>
      call: '',                                        // TODO: booking link for the 20-minute call (cal.com or similar)
      privacy: 'https://app.imin.wtf/legal/privacy'
    },
    /* POST endpoint for "Send us your night" (JSON: type, name, contact, what, when, link, consent, lang).
       Empty = the form only shows the confirmation on the page. */
    pitchEndpoint: ''
  },

  contact: 'contact@imin.support',

  /* POST endpoint for "Keep me posted" (JSON: email, consent, source, lang, consent_text).
     Empty = the form is not wired yet. */
  subscribeEndpoint: '',

  /* Upcoming nights, soonest first. More than one shows "Pick your night". */
  events: [
    {
      id: 'halloween-coffeeshop-rave',
      date: '2026-10-31T15:00',
      end: '2026-10-31T18:00',                       // optional, shown on the poster (sms.html)
      name: 'Halloween CoffeeShop Rave',
      line: 'DJ, coffee, daylight.',
      tags: ['DJ', 'Pumpkin spice', 'Costume contest'], // poster tags (sms.html)
      city: 'Metz',
      format: 'CoffeeShop Rave',
      by: 'IMIN',                                    // or the creator's name
      entry: 'Entry: free with sign-up',
      photo: '',                                     // a real photo of the venue, if there is one
      url: 'https://app.imin.wtf/events'             // TODO: the event page app.imin.wtf/e/...
    }
  ],

  /* The last night. Shown in state C and in "Last time" once enabled. */
  lastNight: {
    enabled: false,                                  // Bohdan switches this on after the first night
    date: '',
    scans: 0,                                        // real door scans, not sign-ups
    headline: '',                                    // e.g. "54 of us. One afternoon."
    photos: [],                                      // 6-9 approved photos
    playlist: '',
    quotes: []                                       // { text, name } — real, with permission
  },

  /* chat.html: Bohdan's voice note in "The idea". Put the recording in src (mp3/m4a, ~20 s);
     until then the play button reads the text along. */
  voiceNote: { src: '', duration: 20, text: "Finding a night is easy. Finding someone to go with is harder. That's what we're working on." },

  /* chat.html: photos IMIN "drops in the chat" in "The nights". Only real, approved photos from IMIN nights. */
  nightPhotos: ['assets/img/photos/night-1.jpg', 'assets/img/photos/night-2.jpg', 'assets/img/photos/night-3.jpg', 'assets/img/photos/night-4.jpg', 'assets/img/photos/night-5.jpg'],

  /* Formats for "The nights". */
  formats: [
    { name: 'CoffeeShop Rave', by: 'IMIN', text: 'Daytime. A DJ, coffee, daylight. A café turns into a dance floor for an afternoon.', photo: 'assets/img/photos/night-4.jpg' }
  ],

  /* Flips the copy in "The idea" and "The nights" once an outside creator has published a night. */
  hasCreatorNights: false,

  /* FAQ 9 only once cancelling a spot in the account works. */
  canCancel: false
};
