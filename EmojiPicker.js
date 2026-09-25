// ============================================================================
// CODEX — EMOJI PICKER  (Shared/EmojiPicker.js)
// ----------------------------------------------------------------------------
// A self-contained, project-wide emoji picker. Built the same way as
// CodexColorPicker, and for the same reason: the composer needs one today, and
// reactions, the status editor, channel names and server descriptions will all
// need the identical thing tomorrow. One entry point, one UI, one recents list
// shared by every caller.
//
// Features
//   · Category rail, search by name and keyword, recent emoji (persisted)
//   · Full keyboard control: arrows walk the grid, Enter picks, Escape closes
//   · Anchored to whatever opened it, flipped and clamped by CodexAnchor
//   · Closes on outside click and on Escape — NOT on window blur: opening
//     DevTools blurs the window, so a blur-close made the picker impossible to
//     inspect. Leaving it open across an app switch is also the friendlier
//     behaviour.
//   · Skin tone applied to every emoji that supports it, remembered globally
//
// EXTENSIBILITY — this is why it takes a `sets` option.
// Codex will grow custom emoji (server emoji, shop packs). Those are images,
// not characters, so the grid renders EITHER a glyph or an <img> depending on
// what the entry carries. Adding a pack later means passing another set, not
// touching this file:
//
//     CodexEmoji.registerSet({
//         id: 'srv_123', label: 'My Server', icon: 'cdxm:abc.png',
//         emoji: [{ id: 'blobwave', src: 'cdxm:def.png', keywords: ['wave'] }],
//     })
//
// ── Public API ──────────────────────────────────────────────────────────────
//   CodexEmoji.open({
//       anchor:   domElement,     // placed next to this
//       target:   textareaOrNull, // convenience: inserts at the caret
//       title:    'Emoji',
//       onPick:   (emoji) => {},  // { char } or { id, src } for custom
//       onClose:  () => {},
//       closeOnPick: false,       // default: stays open for multiple picks
//   })
//   CodexEmoji.close()
//   CodexEmoji.isOpen()
//   CodexEmoji.registerSet(set)
//   CodexEmoji.insertInto(textarea, text)   // caret-aware insert, exported
//                                           // because the composer needs the
//                                           // same behaviour for other inserts
// ============================================================================
 
const CodexEmoji = (() => {
    'use strict';
 
    const RECENT_KEY = 'codex_recent_emoji';
    const TONE_KEY = 'codex_emoji_tone';
    const RECENT_MAX = 24;
 
    // Skin tone modifiers. Index 0 is "no modifier".
    const TONES = ['', '\u{1F3FB}', '\u{1F3FC}', '\u{1F3FD}', '\u{1F3FE}', '\u{1F3FF}'];
 
    // ── Catalogue ────────────────────────────────────────────────────────────
    // Unicode characters, not images: nothing to download, nothing to ship, and
    // the system font renders them. Each entry is [char, name, ...keywords];
    // `tone:true` marks the ones that accept a skin-tone modifier.
    //
    // Deliberately a curated set rather than the full 3,700-emoji Unicode
    // table. A picker people actually scroll beats an exhaustive one nobody
    // can find anything in, and search covers the long tail by name.
    const CATEGORIES = [
        {
            id: 'recent', label: 'Recent',
            icon: 'M12 8v4l3 3M21 12a9 9 0 1 1-9-9',
        },
        {
            id: 'smileys', label: 'Smileys & People',
            icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9 10h.01M15 10h.01M8.5 14a4 4 0 0 0 7 0',
            emoji: [
                ['😀', 'grinning', 'smile', 'happy'], ['😃', 'smiley', 'happy'],
                ['😄', 'smile', 'happy', 'joy'], ['😁', 'grin', 'beam'],
                ['😆', 'laughing', 'satisfied'], ['😅', 'sweat smile', 'relief'],
                ['🤣', 'rofl', 'rolling', 'laugh'], ['😂', 'joy', 'tears', 'laugh'],
                ['🙂', 'slight smile'], ['🙃', 'upside down', 'silly'],
                ['😉', 'wink'], ['😊', 'blush', 'smile'], ['😇', 'innocent', 'halo', 'angel'],
                ['🥰', 'smiling hearts', 'love'], ['😍', 'heart eyes', 'love'],
                ['🤩', 'star struck', 'starry'], ['😘', 'kiss', 'blow kiss'],
                ['😗', 'kissing'], ['😚', 'kissing closed eyes'], ['😋', 'yum', 'tasty'],
                ['😛', 'tongue'], ['😜', 'wink tongue', 'zany'], ['🤪', 'zany', 'goofy'],
                ['😝', 'squint tongue'], ['🤑', 'money mouth', 'rich'],
                ['🤗', 'hug', 'hugging'], ['🤭', 'hand over mouth', 'oops'],
                ['🤫', 'shush', 'quiet', 'silence'], ['🤔', 'thinking', 'hmm'],
                ['🤐', 'zipper mouth'], ['🤨', 'raised eyebrow', 'suspicious'],
                ['😐', 'neutral'], ['😑', 'expressionless'], ['😶', 'no mouth'],
                ['😏', 'smirk'], ['😒', 'unamused'], ['🙄', 'eye roll'],
                ['😬', 'grimace', 'awkward'], ['🤥', 'lying', 'pinocchio'],
                ['😌', 'relieved'], ['😔', 'pensive', 'sad'], ['😪', 'sleepy'],
                ['🤤', 'drooling'], ['😴', 'sleeping', 'zzz'], ['😷', 'mask', 'sick'],
                ['🤒', 'thermometer', 'sick'], ['🤕', 'head bandage', 'hurt', 'injured'],
                ['🤢', 'nauseated', 'sick'], ['🤮', 'vomit'], ['🤧', 'sneeze'],
                ['🥵', 'hot', 'overheated'], ['🥶', 'cold', 'freezing'],
                ['😵', 'dizzy face', 'knocked out'], ['🤯', 'mind blown', 'exploding head'],
                ['🤠', 'cowboy'], ['🥳', 'partying', 'celebrate'],
                ['😎', 'sunglasses', 'cool'], ['🤓', 'nerd', 'geek'],
                ['🧐', 'monocle'], ['😕', 'confused'], ['😟', 'worried'],
                ['🙁', 'frown'], ['😮', 'open mouth', 'wow'], ['😯', 'hushed'],
                ['😲', 'astonished', 'shock'], ['😳', 'flushed', 'embarrassed'],
                ['🥺', 'pleading', 'puppy eyes'], ['😦', 'frowning open'],
                ['😢', 'cry', 'sad', 'tear'], ['😭', 'sob', 'crying', 'bawling'],
                ['😤', 'triumph', 'huff'], ['😠', 'angry', 'mad'],
                ['😡', 'rage', 'furious'], ['🤬', 'cursing', 'swearing'],
                ['💀', 'skull', 'dead'], ['☠️', 'skull crossbones'],
                ['💩', 'poop'], ['🤡', 'clown'], ['👻', 'ghost', 'boo'],
                ['👽', 'alien'], ['🤖', 'robot', 'bot'],
                ['😺', 'cat grin'], ['😻', 'cat heart eyes'], ['😾', 'cat pouting'],
                ['👋', 'wave hand', 'hello', 'bye', 'wave', 1], ['🤚', 'raised back hand', 1],
                ['✋', 'raised hand', 'stop', 1], ['👌', 'ok hand', 'perfect', 1],
                ['🤌', 'pinched fingers', 1], ['✌️', 'victory', 'peace', 1],
                ['🤞', 'crossed fingers', 'luck', 1], ['🤟', 'love you gesture', 1],
                ['🤘', 'rock on', 'horns', 1], ['🤙', 'call me', 'shaka', 1],
                ['👈', 'point left', 1], ['👉', 'point right', 1],
                ['👆', 'point up', 1], ['👇', 'point down', 1],
                ['👍', 'thumbs up', 'yes', 'like', 'approve', 1],
                ['👎', 'thumbs down', 'no', 'dislike', 1],
                ['👊', 'fist bump', 'punch', 1], ['👏', 'clap', 'applause', 1],
                ['🙌', 'raising hands', 'celebrate', 1], ['🙏', 'pray', 'thanks', 'please', 1],
                ['💪', 'muscle', 'strong', 1], ['🫶', 'heart hands', 1],
                ['👀', 'eyes', 'look'], ['🧠', 'brain'],
            ],
        },
        {
            id: 'nature', label: 'Animals & Nature',
            // A paw print: four toes and a pad. The previous path was a
            // half-circle that read as nothing at all.
            icon: 'M12 13.2c2.3 0 4.2 1.7 4.2 3.5S14.6 20 12 20s-4.2-1.5-4.2-3.3 1.9-3.5 4.2-3.5Z'
                + 'M7.2 8.6c.8 0 1.5.9 1.5 2s-.7 2-1.5 2-1.5-.9-1.5-2 .7-2 1.5-2Z'
                + 'M16.8 8.6c.8 0 1.5.9 1.5 2s-.7 2-1.5 2-1.5-.9-1.5-2 .7-2 1.5-2Z'
                + 'M10.4 4.5c.8 0 1.4.9 1.4 2s-.6 2-1.4 2-1.4-.9-1.4-2 .6-2 1.4-2Z'
                + 'M13.6 4.5c.8 0 1.4.9 1.4 2s-.6 2-1.4 2-1.4-.9-1.4-2 .6-2 1.4-2Z',
            emoji: [
                ['🐶', 'dog', 'puppy'], ['🐱', 'cat', 'kitten'], ['🐭', 'mouse face', 'rodent'],
                ['🐹', 'hamster'], ['🐰', 'rabbit', 'bunny'], ['🦊', 'fox'],
                ['🐻', 'bear'], ['🐼', 'panda'], ['🐨', 'koala'], ['🐯', 'tiger'],
                ['🦁', 'lion'], ['🐮', 'cow'], ['🐷', 'pig'], ['🐸', 'frog'],
                ['🐵', 'monkey'], ['🙈', 'see no evil'], ['🙉', 'hear no evil'],
                ['🙊', 'speak no evil'], ['🐧', 'penguin'], ['🐦', 'bird'],
                ['🦆', 'duck'], ['🦅', 'eagle'], ['🦉', 'owl'], ['🦇', 'bat'],
                ['🐺', 'wolf'], ['🐗', 'boar'], ['🐴', 'horse'], ['🦄', 'unicorn'],
                ['🐝', 'bee'], ['🦋', 'butterfly'], ['🐌', 'snail'],
                ['🐢', 'turtle'], ['🐍', 'snake'], ['🦖', 'dinosaur', 'trex'],
                ['🐙', 'octopus'], ['🦑', 'squid'], ['🦈', 'shark'],
                ['🐬', 'dolphin'], ['🐳', 'whale'], ['🐟', 'fish'],
                ['🌸', 'cherry blossom', 'flower'], ['🌹', 'rose'],
                ['🌻', 'sunflower'], ['🌷', 'tulip'], ['🌱', 'seedling'],
                ['🌲', 'evergreen', 'tree'], ['🌵', 'cactus'], ['🍀', 'clover', 'luck'],
                ['🍁', 'maple leaf'], ['🌈', 'rainbow'], ['⭐', 'star'],
                ['🌟', 'glowing star', 'sparkle'], ['✨', 'sparkles'],
                ['⚡', 'zap', 'lightning'], ['🔥', 'fire', 'lit', 'hot'],
                ['💧', 'droplet'], ['🌊', 'ocean wave', 'sea', 'water', 'wave'], ['🌙', 'moon'],
                ['☀️', 'sun'], ['☁️', 'cloud'], ['❄️', 'snowflake', 'cold'],
            ],
        },
        {
            id: 'food', label: 'Food & Drink',
            icon: 'M6 3v8a3 3 0 0 0 6 0V3M9 11v10M18 3c-1.5 2-2 4-2 6h4c0-2-.5-4-2-6ZM18 9v12',
            emoji: [
                ['🍎', 'apple'], ['🍊', 'orange', 'tangerine'], ['🍋', 'lemon'],
                ['🍌', 'banana'], ['🍉', 'watermelon'], ['🍇', 'grapes'],
                ['🍓', 'strawberry'], ['🫐', 'blueberries'], ['🍑', 'peach'],
                ['🥝', 'kiwi'], ['🥑', 'avocado'], ['🍅', 'tomato'],
                ['🌽', 'corn'], ['🥕', 'carrot'], ['🥐', 'croissant'],
                ['🍞', 'bread'], ['🧀', 'cheese'], ['🥚', 'egg'],
                ['🍳', 'cooking', 'fried egg'], ['🥞', 'pancakes'],
                ['🥓', 'bacon'], ['🍔', 'burger', 'hamburger'], ['🍟', 'fries'],
                ['🍕', 'pizza'], ['🌭', 'hot dog'], ['🌮', 'taco'],
                ['🌯', 'burrito'], ['🍜', 'ramen', 'noodles'], ['🍣', 'sushi'],
                ['🍤', 'shrimp'], ['🍚', 'rice'], ['🍦', 'ice cream'],
                ['🍰', 'cake', 'slice'], ['🎂', 'birthday cake'],
                ['🍫', 'chocolate'], ['🍬', 'candy'], ['🍪', 'cookie'],
                ['🍿', 'popcorn'], ['☕', 'coffee', 'hot drink'], ['🍵', 'tea'],
                ['🧋', 'bubble tea', 'boba'], ['🥤', 'soda', 'cup'],
                ['🍺', 'beer'], ['🍻', 'cheers', 'beers'], ['🥂', 'champagne', 'toast'],
                ['🍷', 'wine'], ['🧊', 'ice'],
            ],
        },
        {
            id: 'activity', label: 'Activity',
            icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3.5 9h17M3.5 15h17M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18',
            emoji: [
                ['⚽', 'soccer', 'football'], ['🏀', 'basketball'],
                ['🏈', 'american football'], ['⚾', 'baseball'], ['🎾', 'tennis'],
                ['🏐', 'volleyball'], ['🎱', 'pool', '8 ball'], ['🏓', 'ping pong'],
                ['🏸', 'badminton'], ['🥅', 'goal'], ['⛳', 'golf'],
                ['🎯', 'dart', 'bullseye', 'target'], ['🎮', 'video game', 'gaming'],
                ['🕹️', 'joystick', 'arcade'], ['🎲', 'dice'], ['🧩', 'puzzle'],
                ['♟️', 'chess'], ['🎨', 'art', 'palette'], ['🎭', 'theater'],
                ['🎬', 'clapper', 'movie'], ['🎤', 'microphone', 'sing'],
                ['🎧', 'headphones', 'listening'], ['🎵', 'note', 'music'],
                ['🎶', 'notes', 'music'], ['🎸', 'guitar'], ['🎹', 'piano', 'keyboard'],
                ['🥁', 'drum'], ['🎺', 'trumpet'], ['🏆', 'trophy', 'win'],
                ['🥇', 'gold medal', 'first'], ['🎉', 'party popper', 'tada'],
                ['🎊', 'confetti'], ['🎁', 'gift', 'present'], ['🎈', 'balloon'],
            ],
        },
        {
            id: 'travel', label: 'Travel & Places',
            icon: 'M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
            emoji: [
                ['🚗', 'car'], ['🚕', 'taxi'], ['🚌', 'bus'], ['🏎️', 'race car'],
                ['🚓', 'police car'], ['🚑', 'ambulance'], ['🚒', 'fire engine'],
                ['🛵', 'scooter'], ['🚲', 'bicycle', 'bike'], ['🛴', 'kick scooter'],
                ['✈️', 'airplane', 'flight'], ['🚀', 'rocket', 'launch'],
                ['🛸', 'ufo'], ['🚁', 'helicopter'], ['⛵', 'sailboat'],
                ['🚢', 'ship'], ['🚂', 'train'], ['🗺️', 'map'],
                ['🏠', 'house', 'home'], ['🏢', 'office'], ['🏰', 'castle'],
                ['⛺', 'tent', 'camping'], ['🏝️', 'island'], ['🏔️', 'mountain'],
                ['🌋', 'volcano'], ['🌅', 'sunrise'], ['🌃', 'night city'],
                ['🌌', 'milky way', 'galaxy'], ['🌍', 'earth', 'globe', 'world'],
                ['🗿', 'moai', 'statue'], ['🎡', 'ferris wheel'],
            ],
        },
        {
            id: 'objects', label: 'Objects',
            icon: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3Z',
            emoji: [
                ['💻', 'laptop', 'computer'], ['🖥️', 'desktop'], ['⌨️', 'keyboard'],
                ['🖱️', 'computer mouse', 'click'], ['📱', 'phone', 'mobile'], ['☎️', 'telephone'],
                ['📷', 'camera'], ['📹', 'video camera'], ['📺', 'tv'],
                ['💾', 'floppy', 'save'], ['💿', 'disc'], ['🔋', 'battery'],
                ['🔌', 'plug'], ['💡', 'bulb', 'idea', 'light'], ['🔦', 'flashlight'],
                ['🕯️', 'candle'], ['📖', 'book', 'open book'], ['📚', 'books'],
                ['📝', 'memo', 'note', 'write'], ['✏️', 'pencil'], ['🖊️', 'pen'],
                ['📌', 'pin'], ['📎', 'paperclip', 'attach'], ['✂️', 'scissors'],
                ['🔑', 'key'], ['🔒', 'lock', 'locked'], ['🔓', 'unlock'],
                ['🔔', 'bell', 'notification'], ['🔕', 'muted bell'],
                ['⏰', 'alarm clock'], ['⌛', 'hourglass'], ['💰', 'money bag'],
                ['💳', 'credit card'], ['💎', 'gem', 'diamond'], ['⚙️', 'gear', 'settings'],
                ['🔧', 'wrench', 'fix'], ['🔨', 'hammer'], ['🧪', 'test tube'],
                ['🧲', 'magnet'], ['🩹', 'adhesive bandage', 'plaster'], ['🎀', 'ribbon', 'bow'],
                ['📦', 'package', 'box'], ['📬', 'mailbox', 'mail'],
                ['🗑️', 'trash', 'delete', 'bin'], ['🛒', 'cart', 'shopping'],
            ],
        },
        {
            id: 'symbols', label: 'Symbols',
            icon: 'M12 20.5s-7.5-4.7-7.5-10a4.2 4.2 0 0 1 7.5-2.6A4.2 4.2 0 0 1 19.5 10.5c0 5.3-7.5 10-7.5 10Z',
            emoji: [
                ['❤️', 'red heart', 'love'], ['🧡', 'orange heart'],
                ['💛', 'yellow heart'], ['💚', 'green heart'], ['💙', 'blue heart'],
                ['💜', 'purple heart'], ['🖤', 'black heart'], ['🤍', 'white heart'],
                ['🤎', 'brown heart'], ['💔', 'broken heart'],
                ['💕', 'two hearts'], ['💖', 'sparkling heart'],
                ['💘', 'heart arrow'], ['💯', 'hundred', 'perfect'],
                ['💢', 'anger'], ['💤', 'zzz', 'sleep'], ['💫', 'dizzy symbol', 'stars'],
                ['✅', 'check', 'done', 'yes'], ['❌', 'cross', 'no', 'wrong'],
                ['❗', 'exclamation'], ['❓', 'question'], ['⚠️', 'warning'],
                ['🚫', 'prohibited', 'no entry'], ['♻️', 'recycle'],
                ['🔴', 'red circle'], ['🟠', 'orange circle'], ['🟡', 'yellow circle'],
                ['🟢', 'green circle'], ['🔵', 'blue circle'], ['🟣', 'purple circle'],
                ['⚫', 'black circle'], ['⚪', 'white circle'],
                ['🔺', 'red triangle'], ['🔷', 'blue diamond'],
                ['🆕', 'new'], ['🆓', 'free'], ['🔞', 'no one under 18'],
                ['➕', 'plus'], ['➖', 'minus'], ['✖️', 'multiply'],
                ['♾️', 'infinity'], ['🔗', 'link'],
            ],
        },
    ];
 
    // ── Custom sets ──────────────────────────────────────────────────────────
    // Registered at runtime: server emoji, shop packs. Each is
    // { id, label, icon, emoji: [{ id, src, keywords }] }.
    const _sets = [];
 
    function registerSet(set) {
        if (!set?.id || !Array.isArray(set.emoji)) return false;
        const i = _sets.findIndex(s => s.id === set.id);
        if (i === -1) _sets.push(set); else _sets[i] = set;
        if (_root) rebuildRail();
        return true;
    }
 
    function unregisterSet(id) {
        const i = _sets.findIndex(s => s.id === id);
        if (i !== -1) { _sets.splice(i, 1); if (_root) rebuildRail(); }
    }
 
    // ── Persistence ──────────────────────────────────────────────────────────
    function readRecent() {
        try {
            const a = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
            return Array.isArray(a) ? a.slice(0, RECENT_MAX) : [];
        } catch { return []; }
    }
 
    function pushRecent(entry) {
        const key = entry.char || entry.id;
        const list = readRecent().filter(e => (e.char || e.id) !== key);
        list.unshift(entry);
        try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
        } catch { }
    }
 
    const readTone = () => {
        const n = parseInt(localStorage.getItem(TONE_KEY) || '0', 10);
        return Number.isInteger(n) && n >= 0 && n < TONES.length ? n : 0;
    };
    const writeTone = (n) => { try { localStorage.setItem(TONE_KEY, String(n)); } catch { } };
 
    /** Apply the current skin tone to an emoji that supports one. */
    function toned(char, supportsTone) {
        if (!supportsTone || !_tone) return char;
        // The modifier follows the base character AND REPLACES any variation
        // selector: a skin-tone modifier already forces emoji presentation, so
        // U+270C U+1F3FD is the correct sequence and U+270C U+1F3FD U+FE0F is
        // not. Keeping the selector renders on most systems but is malformed,
        // and malformed sequences are what break when the text is stored,
        // searched or sent somewhere else.
        return char.replace(/^(\P{M}\p{Emoji}?)\uFE0F?/u,
            (m, base) => base + TONES[_tone]);
    }
 
    // ── State ────────────────────────────────────────────────────────────────
    let _root = null, _opts = {}, _cat = 'smileys', _query = '', _tone = readTone();
    let _cells = [], _focus = -1;
 
    const isOpen = () => !!_root;
 
    // ── Build ────────────────────────────────────────────────────────────────
    function el(tag, cls, parent) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (parent) parent.appendChild(n);
        return n;
    }
 
    function icon(path) {
        return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ` +
            `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">` +
            `<path d="${path}"/></svg>`;
    }
 
    function build() {
        const root = el('div', 'CEP-Popup');
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', _opts.title || 'Emoji');
 
        // Search
        const head = el('div', 'CEP-Head', root);
        const search = el('input', 'CEP-Search', head);
        search.type = 'text';
        search.placeholder = 'Search emoji';
        search.setAttribute('aria-label', 'Search emoji');
        search.addEventListener('input', () => {
            _query = search.value.trim().toLowerCase();
            renderGrid();
        });
 
        // Category rail
        el('div', 'CEP-Rail', root);
 
        // Grid
        const body = el('div', 'CEP-Body', root);
        el('div', 'CEP-Grid', body);
 
        // Footer: preview + skin tone
        const foot = el('div', 'CEP-Foot', root);
        el('div', 'CEP-Preview', foot).innerHTML =
            '<span class="CEP-Preview-Glyph"></span><span class="CEP-Preview-Name"></span>';
 
        const tone = el('button', 'CEP-Tone', foot);
        tone.type = 'button';
        tone.title = 'Skin tone';
        tone.addEventListener('click', (e) => { e.stopPropagation(); toggleTonePicker(tone); });
 
        return root;
    }
 
    function rebuildRail() {
        const rail = _root?.querySelector('.CEP-Rail');
        if (!rail) return;
        rail.innerHTML = '';
 
        const all = [...CATEGORIES, ..._sets];
        all.forEach(c => {
            const b = el('button', 'CEP-Cat', rail);
            b.type = 'button';
            b.title = c.label;
            b.setAttribute('aria-label', c.label);
            b.classList.toggle('CEP-Cat-Active', c.id === _cat);
            // A built-in category draws an SVG glyph; a custom set shows its
            // own artwork, which is the whole point of registering one.
            if (c.icon && c.icon.startsWith('cdxm:')) {
                const img = el('img', 'cdx-media', b);
                img.src = window.CodexMedia?.src(c.icon) || '';
                img.alt = '';
            } else if (c.icon) {
                b.innerHTML = icon(c.icon);
            } else {
                b.textContent = (c.label || '?').slice(0, 1);
            }
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                _cat = c.id; _query = '';
                const s = _root.querySelector('.CEP-Search');
                if (s) s.value = '';
                rebuildRail(); renderGrid();
            });
        });
    }
 
    /** Everything the grid could show, flattened, for search. */
    function allEntries() {
        const out = [];
        CATEGORIES.forEach(c => (c.emoji || []).forEach(e => {
            out.push({ char: e[0], name: e[1], words: e.slice(1).filter(x => typeof x === 'string'), tone: e[e.length - 1] === 1 });
        }));
        _sets.forEach(s => (s.emoji || []).forEach(e => {
            out.push({ id: e.id, src: e.src, name: e.id, words: e.keywords || [], set: s.id });
        }));
        return out;
    }
 
    function currentEntries() {
        if (_query) {
            return allEntries().filter(e =>
                e.name.includes(_query) || e.words.some(w => w.includes(_query)));
        }
        if (_cat === 'recent') return readRecent();
 
        const custom = _sets.find(s => s.id === _cat);
        if (custom) {
            return (custom.emoji || []).map(e =>
                ({ id: e.id, src: e.src, name: e.id, words: e.keywords || [], set: custom.id }));
        }
        const c = CATEGORIES.find(x => x.id === _cat);
        return (c?.emoji || []).map(e =>
            ({ char: e[0], name: e[1], words: [], tone: e[e.length - 1] === 1 }));
    }
 
    function renderGrid() {
        const grid = _root?.querySelector('.CEP-Grid');
        if (!grid) return;
        grid.innerHTML = '';
        _cells = []; _focus = -1;
 
        const list = currentEntries();
        if (!list.length) {
            const empty = el('div', 'CEP-Empty', grid);
            empty.textContent = _cat === 'recent' && !_query
                ? 'Emoji you use will show up here.'
                : 'Nothing matches that.';
            return;
        }
 
        list.forEach((e) => {
            const b = el('button', 'CEP-Cell', grid);
            b.type = 'button';
            const ch = e.char ? toned(e.char, e.tone) : null;
            if (ch) { b.textContent = ch; b.title = e.name; }
            else {
                const img = el('img', 'cdx-media', b);
                img.src = window.CodexMedia?.src(e.src) || e.src || '';
                img.alt = e.name || '';
                b.title = ':' + (e.id || '') + ':';
            }
            b.addEventListener('click', (ev) => { ev.stopPropagation(); pick(e, ch); });
            b.addEventListener('mouseenter', () => preview(e, ch));
            _cells.push(b);
        });
    }
 
    function preview(e, ch) {
        const g = _root?.querySelector('.CEP-Preview-Glyph');
        const n = _root?.querySelector('.CEP-Preview-Name');
        if (!g || !n) return;
        if (ch) { g.textContent = ch; g.innerHTML = g.innerHTML; }
        else {
            g.textContent = '';
            const img = el('img', null, g);
            img.src = window.CodexMedia?.src(e.src) || e.src || '';
            img.alt = '';
        }
        n.textContent = e.char ? e.name : ':' + (e.id || '') + ':';
    }
 
    function pick(entry, ch) {
        const out = ch
            ? { char: ch, name: entry.name }
            : { id: entry.id, src: entry.src, set: entry.set, name: entry.name };
        pushRecent(ch ? { char: ch, name: entry.name } : out);
 
        // Convenience path: most callers just want it in a textarea.
        if (_opts.target) insertInto(_opts.target, ch || `:${entry.id}:`);
        _opts.onPick?.(out);
 
        // Default is to STAY open: people pick several in a row, and a picker
        // that closes after one makes that four clicks instead of two.
        if (_opts.closeOnPick) close();
        else if (_cat === 'recent') renderGrid();
    }
 
    // ── Skin tone ────────────────────────────────────────────────────────────
    function paintTone() {
        const b = _root?.querySelector('.CEP-Tone');
        if (b) b.textContent = toned('✋', true);
    }
 
    function toggleTonePicker(btn) {
        const existing = _root.querySelector('.CEP-Tones');
        if (existing) { existing.remove(); return; }
        const box = el('div', 'CEP-Tones', _root);
        TONES.forEach((_, i) => {
            const t = el('button', 'CEP-Tone-Opt', box);
            t.type = 'button';
            t.classList.toggle('CEP-Tone-Active', i === _tone);
            const prev = _tone; _tone = i;
            t.textContent = toned('✋', true);
            _tone = prev;
            t.addEventListener('click', (e) => {
                e.stopPropagation();
                _tone = i; writeTone(i);
                box.remove(); paintTone(); renderGrid();
            });
        });
        const r = btn.getBoundingClientRect();
        const pr = _root.getBoundingClientRect();
        box.style.right = (pr.right - r.right) + 'px';
        box.style.bottom = (pr.bottom - r.top + 6) + 'px';
    }
 
    // ── Keyboard ─────────────────────────────────────────────────────────────
    function moveFocus(delta) {
        if (!_cells.length) return;
        const next = Math.max(0, Math.min(_cells.length - 1,
            (_focus < 0 ? 0 : _focus + delta)));
        _focus = next;
        _cells.forEach((c, i) => c.classList.toggle('CEP-Cell-Focus', i === next));
        _cells[next].scrollIntoView({ block: 'nearest' });
        _cells[next].dispatchEvent(new Event('mouseenter'));
    }
 
    /** Columns per row, measured rather than assumed, so arrows track layout. */
    function cols() {
        if (_cells.length < 2) return 1;
        const top = _cells[0].offsetTop;
        let n = 0;
        while (n < _cells.length && _cells[n].offsetTop === top) n++;
        return Math.max(1, n);
    }
 
    function onKey(e) {
        if (!_root) return;
        if (e.key === 'Escape') { e.preventDefault(); close(); return; }
        if (e.key === 'Enter' && _focus >= 0) { e.preventDefault(); _cells[_focus].click(); return; }
        const map = {
            ArrowRight: 1, ArrowLeft: -1,
            ArrowDown: cols(), ArrowUp: -cols(),
        };
        if (map[e.key] !== undefined) { e.preventDefault(); moveFocus(map[e.key]); }
    }
 
    // ── Insert helper ────────────────────────────────────────────────────────
    /**
     * Insert text at a textarea's caret, keeping focus and selection sane.
     * Exported because it is genuinely reusable — any future "insert a mention"
     * or "insert a custom emoji" path needs exactly this.
     */
    function insertInto(ta, text) {
        if (!ta) return;
        const a = ta.selectionStart ?? ta.value.length;
        const b = ta.selectionEnd ?? a;
        ta.value = ta.value.slice(0, a) + text + ta.value.slice(b);
        const caret = a + text.length;
        ta.setSelectionRange(caret, caret);
        ta.focus();
        // So autogrow, drafts and anything else listening keep up.
        ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
 
    // ── Open / close ─────────────────────────────────────────────────────────
    function place() {
        if (!_root || !_opts.anchor) return;
        const r = _opts.anchor.getBoundingClientRect();
        const w = _root.offsetWidth || 340;
        const h = _root.offsetHeight || 400;
        const A = window.CodexAnchor;
 
        // Above the anchor by default — it hangs off a composer at the bottom
        // of the screen — flipping below only when there is no room up there.
        const above = r.top - 10 - h;
        const top = above >= 12 ? above : r.bottom + 10;
        // Right-align with the anchor: the button is near the right edge, so a
        // left-aligned panel would run off screen.
        const left = r.right - w;
 
        _root.style.left = (A ? A.clampH(left, w)
            : Math.max(12, Math.min(left, window.innerWidth - w - 12))) + 'px';
        _root.style.top = (A ? A.clampV(top, h)
            : Math.max(12, Math.min(top, window.innerHeight - h - 12))) + 'px';
    }
 
    function onDocDown(e) {
        if (!_root) return;
        if (_root.contains(e.target)) return;
        if (_opts.anchor && _opts.anchor.contains(e.target)) return;   // the toggle handles itself
        close();
    }
 
    function open(opts = {}) {
        close();
        _opts = opts;
        _cat = readRecent().length ? 'recent' : 'smileys';
        _query = '';
 
        _root = build();
        document.body.appendChild(_root);
        rebuildRail();
        renderGrid();
        paintTone();
        place();
 
        requestAnimationFrame(() => {
            _root?.classList.add('CEP-In');
            _root?.querySelector('.CEP-Search')?.focus();
        });
 
        document.addEventListener('pointerdown', onDocDown, true);
        document.addEventListener('keydown', onKey, true);
        _unwatch = window.CodexAnchor?.onReflow(place) || null;
        return _root;
    }
 
    let _unwatch = null;
 
    function close() {
        if (!_root) return;
        document.removeEventListener('pointerdown', onDocDown, true);
        document.removeEventListener('keydown', onKey, true);
        _unwatch?.(); _unwatch = null;
        _root.remove();
        _root = null;
        const cb = _opts.onClose; _opts = {};
        cb?.();
    }
 
    /**
     * A random emoji character, for a button that wants to show one.
     * Prefers what you actually use: your recents first, the general set
     * otherwise, so the face on the button feels like yours.
     */
    function randomEmoji() {
        const recent = readRecent().filter(e => e.char);
        const pool = recent.length >= 5 ? recent : allEntries().filter(e => e.char);
        if (!pool.length) return '\u{1F600}';
        return pool[Math.floor(Math.random() * pool.length)].char;
    }
 
    return {
        open, close, isOpen, registerSet, unregisterSet, insertInto,
        readRecent, randomEmoji, CATEGORIES,
    };
})();
 
window.CodexEmoji = CodexEmoji;