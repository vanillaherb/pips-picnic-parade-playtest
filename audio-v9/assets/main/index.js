System.register("chunks:///_virtual/AdRewards.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      exports({
        adGateFinish: adGateFinish,
        adGateStart: adGateStart,
        bonusPct: bonusPct,
        claimGift: claimGift,
        createAdGate: createAdGate,
        createGift: createGift,
        curvePrices: curvePrices,
        giftAvailable: giftAvailable,
        giftReward: giftReward,
        nextPrice: nextPrice,
        onRoundEnd: onRoundEnd,
        resultReward: resultReward,
        round5: round5
      });
      cclegacy._RF.push({}, "9947f6Ek/RPUadYqpu7AIH/", "AdRewards", undefined);
      // @ts-nocheck
      // AdRewards.ts — the universal ad mechanism module (both boards; references/game-modules.md, user 2026-10-23).
      // COPY THIS FILE UNCHANGED into the game (audit_game_modules.py compares its SHA-256 with the skill's copy).
      // Plain JavaScript inside a .ts file: runs in Cocos 2.4 / 3.x and Node. Pure functions, no engine calls.
      // The numbers of every game come from two files only: unlock_table.json (R = coins_per_ad, skin prices and bonuses)
      // and level_plan.json (coins of each level; bonus levels already pay 3x there).
      //
      // Game glue:
      //   result page:  r = resultReward(levelCoins, bonusPct(table, equippedIds)); show r.total and the "x2" ad button
      //                 (pays r.doubled instead of r.total; "No thanks" pays r.total). Every level end / every endless run end.
      //   home gift:    if (giftAvailable(gift)) show the 10-frame gift box; tap -> ad -> r = claimGift(gift, R, table, owned, cleared)
      //                 -> grant r.coins, save r.state. After every level end / run end: gift = onRoundEnd(gift).
      //   ad buttons:   g = createAdGate(); on tap: token = adGateStart(g); if (!token) return; play the ad; on any callback:
      //                 if (adGateFinish(g, token, completed)) pay the reward once.

      var AD_REWARDS_VERSION = exports('AD_REWARDS_VERSION', 2);
      var RESULT_AD_MULTIPLIER = exports('RESULT_AD_MULTIPLIER', 2); // every level end / run end: watch an ad -> double
      var BONUS_LEVEL_MULTIPLIER = exports('BONUS_LEVEL_MULTIPLIER', 3); // bonus level coins in level_plan.json = 3x a normal level (x2 with the ad = 6x)
      var PRICE_STEPS = exports('PRICE_STEPS', [1, 4, 10, 20]); // price gap to the previous skin, in R: common, rare, epic, legendary
      var FIRST_PRICE_R = exports('FIRST_PRICE_R', 2); // the first skin for sale costs 2R
      var GIFT_SHARE = exports('GIFT_SHARE', 0.1); // home gift box: 10% of the next skin price ...
      var GIFT_PER_10_LEVELS = exports('GIFT_PER_10_LEVELS', 0.5); // ... plus 0.5R for every 10 levels cleared (endless: 10 runs)

      function isNum(v) {
        return typeof v === 'number' && isFinite(v);
      }
      function round5(x) {
        return Math.max(5, Math.round(x / 5) * 5);
      }
      function itemsOf(table) {
        return table && Array.isArray(table.items) ? table.items : Array.isArray(table) ? table : [];
      }

      // skin + background bonus of what is equipped (one of each), in percent
      function bonusPct(table, equippedIds) {
        var on = {};
        (equippedIds || []).forEach(function (id) {
          on[id] = true;
        });
        var pct = 0;
        var seen = {};
        itemsOf(table).forEach(function (it) {
          if (!on[it.id] || seen[it.group] || !it.bonus || it.bonus.type !== 'coins' || !isNum(it.bonus.pct)) return;
          seen[it.group] = true;
          pct += it.bonus.pct;
        });
        return pct;
      }

      // coins of one level end (or run end): bonus applied once, the ad doubles the total
      function resultReward(levelCoins, pct) {
        var base = Math.max(0, Math.round(levelCoins || 0));
        var total = Math.round(base * (1 + (pct || 0) / 100));
        return {
          base: base,
          skin_bonus: total - base,
          total: total,
          doubled: total * RESULT_AD_MULTIPLIER
        };
      }

      // the cheapest skin/background still for sale (coins), or the most expensive one when everything is owned
      function nextPrice(table, ownedIds) {
        var own = {};
        (ownedIds || []).forEach(function (id) {
          own[id] = true;
        });
        var priced = itemsOf(table).filter(function (it) {
          return it.unlock === 'coins' && isNum(it.coins) && it.coins > 0;
        });
        if (!priced.length) return 0;
        var left = priced.filter(function (it) {
          return !own[it.id];
        }).map(function (it) {
          return it.coins;
        });
        return left.length ? Math.min.apply(null, left) : Math.max.apply(null, priced.map(function (it) {
          return it.coins;
        }));
      }
      function giftReward(R, table, ownedIds, cleared) {
        var p = nextPrice(table, ownedIds);
        return round5(Math.max(R, GIFT_SHARE * p) + GIFT_PER_10_LEVELS * R * Math.floor(Math.max(0, cleared || 0) / 10));
      }

      // one charge: full at the start, used by a claim, refilled after every level end / run end (never more than one)
      function createGift() {
        return {
          charges: 1
        };
      }
      function giftAvailable(state) {
        return !!state && state.charges > 0;
      }
      function onRoundEnd(state) {
        return {
          charges: 1
        };
      }
      function claimGift(state, R, table, ownedIds, cleared) {
        if (!giftAvailable(state)) return {
          coins: 0,
          state: {
            charges: 0
          }
        };
        return {
          coins: giftReward(R, table, ownedIds, cleared),
          state: {
            charges: 0
          }
        };
      }

      // one ad at a time, one reward per ad: double taps and repeated callbacks do nothing
      function createAdGate() {
        return {
          busy: false,
          paid: 0,
          sequence: 0,
          active: null
        };
      }
      function adGateStart(g) {
        if (g.busy) return false;
        var token = Object.freeze({
          request: ++g.sequence
        });
        g.busy = true;
        g.active = token;
        return token;
      }
      function adGateFinish(g, token, completed) {
        if (!g.busy || !token || g.active !== token) return false;
        g.active = null;
        g.busy = false;
        if (completed !== true) return false;
        g.paid += 1;
        return true;
      }

      // price list of one group: first 2R, then +1R / +4R / +10R / +20R per skin by rarity (make_skin_table.py does the same)
      function curvePrices(R, rarities) {
        var rank = {
          common: 0,
          rare: 1,
          epic: 2,
          legendary: 3
        };
        var out = [];
        rarities.forEach(function (r, i) {
          out.push(i === 0 ? FIRST_PRICE_R * R : out[i - 1] + PRICE_STEPS[rank[r]] * R);
        });
        return out;
      }
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ArtDownloadGuard.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _extends, _createForOfIteratorHelperLoose, cclegacy, assetManager, sys;
  return {
    setters: [function (module) {
      _extends = module.extends;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      assetManager = module.assetManager;
      sys = module.sys;
    }],
    execute: function () {
      cclegacy._RF.push({}, "a40e3mz5KJKy79ZOE2TvH80", "ArtDownloadGuard", undefined);

      /** Settles only this game's resources/native PNG tasks; preserves the engine image result/parser contract. */
      var ArtDownloadGuard = exports('ArtDownloadGuard', /*#__PURE__*/function () {
        function ArtDownloadGuard() {
          this.original = null;
          this.handler = null;
          this.pending = [];
          this.attempts = new Map();
          this.onProgress = null;
        }
        var _proto = ArtDownloadGuard.prototype;
        _proto.install = function install() {
          var _downloader$handlers,
            _downloader$_download,
            _this = this;
          var downloader = assetManager.downloader;
          this.original = ((_downloader$handlers = downloader.handlers) == null ? void 0 : _downloader$handlers['.png']) || ((_downloader$_download = downloader._downloaders) == null ? void 0 : _downloader$_download['.png']);
          if (typeof this.original !== 'function') throw new Error('Cocos PNG downloader is unavailable');
          var original = this.original;
          this.handler = function (url, options, callback) {
            if (!/(?:^|\/)assets\/resources\/native\//.test(String(url))) return original(url, options, callback);
            var attempt = (_this.attempts.get(url) || 0) + 1;
            _this.attempts.set(url, attempt);
            var remote = /^https?:\/\//i.test(url) || sys.isBrowser;
            var requestURL = attempt > 1 && remote ? url + (url.includes('?') ? '&' : '?') + '__picnic_art_retry=' + attempt : url;
            var item = {
              url: url,
              requestURL: requestURL,
              attempt: attempt,
              last: Date.now(),
              loaded: 0,
              done: false
            };
            _this.pending.push(item);
            var finish = function finish(error, result) {
              if (item.done) {
                if (result && typeof result.close === 'function') result.close();
                return;
              }
              item.done = true;
              callback(error, result);
            };
            item.fail = function () {
              return finish(new Error('Picnic art request stopped making progress'));
            };
            var progress = options == null ? void 0 : options.onFileProgress;
            var opts = _extends({}, options, {
              maxRetryCount: 0,
              xhrTimeout: 13000,
              onFileProgress: function onFileProgress(loaded, total) {
                if (loaded > item.loaded) {
                  item.loaded = loaded;
                  item.last = Date.now();
                  _this.onProgress == null || _this.onProgress(url);
                }
                progress == null || progress(loaded, total);
              }
            });
            try {
              return original(requestURL, opts, finish);
            } catch (error) {
              finish(error);
            }
          };
          downloader.register('.png', this.handler);
        };
        _proto.tick = function tick() {
          var now = Date.now();
          for (var _iterator = _createForOfIteratorHelperLoose(this.pending), _step; !(_step = _iterator()).done;) {
            var item = _step.value;
            if (!item.done && now - item.last > 13500) item.fail();
          }
          this.pending = this.pending.filter(function (item) {
            return !item.done;
          });
        };
        _proto.cancelPending = function cancelPending() {
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.pending), _step2; !(_step2 = _iterator2()).done;) {
            var item = _step2.value;
            if (!item.done) item.fail();
          }
          this.pending = this.pending.filter(function (item) {
            return !item.done;
          });
        };
        _proto.resume = function resume() {
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.pending), _step3; !(_step3 = _iterator3()).done;) {
            var item = _step3.value;
            if (!item.done) item.last = Date.now();
          }
        };
        _proto.snapshot = function snapshot() {
          return this.pending.filter(function (item) {
            return !item.done;
          }).map(function (_ref) {
            var url = _ref.url,
              requestURL = _ref.requestURL,
              attempt = _ref.attempt,
              loaded = _ref.loaded,
              last = _ref.last;
            return {
              url: url,
              requestURL: requestURL,
              attempt: attempt,
              loaded: loaded,
              idleMs: Date.now() - last
            };
          });
        };
        _proto.dispose = function dispose() {
          var _downloader$handlers2, _downloader$_download2;
          var downloader = assetManager.downloader;
          if ((((_downloader$handlers2 = downloader.handlers) == null ? void 0 : _downloader$handlers2['.png']) || ((_downloader$_download2 = downloader._downloaders) == null ? void 0 : _downloader$_download2['.png'])) === this.handler) downloader.register('.png', this.original);
          for (var _iterator4 = _createForOfIteratorHelperLoose(this.pending), _step4; !(_step4 = _iterator4()).done;) {
            var item = _step4.value;
            if (!item.done) item.fail();
          }
          this.pending = [];
        };
        return ArtDownloadGuard;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/ArtLayer.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _construct, _createForOfIteratorHelperLoose, _asyncToGenerator, _regeneratorRuntime, cclegacy, Node, Layers, UITransform, Sprite, Rect, SpriteFrame, Graphics, Color, Label, resources, Texture2D, BitmapFont, UIOpacity;
  return {
    setters: [function (module) {
      _construct = module.construct;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _asyncToGenerator = module.asyncToGenerator;
      _regeneratorRuntime = module.regeneratorRuntime;
    }, function (module) {
      cclegacy = module.cclegacy;
      Node = module.Node;
      Layers = module.Layers;
      UITransform = module.UITransform;
      Sprite = module.Sprite;
      Rect = module.Rect;
      SpriteFrame = module.SpriteFrame;
      Graphics = module.Graphics;
      Color = module.Color;
      Label = module.Label;
      resources = module.resources;
      Texture2D = module.Texture2D;
      BitmapFont = module.BitmapFont;
      UIOpacity = module.UIOpacity;
    }],
    execute: function () {
      cclegacy._RF.push({}, "b9e5d+o/5ZCW4vZ5IX0cMhL", "ArtLayer", undefined);

      /** Generated normal art. Pending/failure UI fallback and official Cocos loading follow the explicit updated Skill exceptions. Atlas rectangles reference original pixels. */
      var ART = exports('ART', {
        logo: 'art/branding/picnic_logo',
        background: function background(id) {
          return 'art/backgrounds/' + (id || 'bg_01');
        },
        hero: function hero(id) {
          return 'art/heroes/' + (id || 'hero_01');
        }
      });
      var UI_RECTS = [[0, 35, 319, 225], [321, 35, 308, 225], [634, 35, 307, 225], [946, 35, 308, 225], [14, 285, 302, 288], [327, 280, 304, 295], [641, 284, 298, 292], [954, 285, 288, 291], [12, 590, 304, 290], [327, 590, 305, 291], [643, 590, 297, 289], [955, 591, 287, 285], [0, 888, 431, 308], [429, 984, 287, 177], [714, 907, 235, 290], [958, 876, 280, 320]];
      var BUTTON_RECTS = {
        "0": [57, 9, 683, 162],
        "1": [766, 9, 680, 162],
        "3": [45, 186, 701, 164],
        "4": [771, 186, 677, 165],
        "6": [21, 364, 715, 164],
        "7": [762, 363, 676, 162],
        "9": [25, 543, 723, 164],
        "10": [767, 541, 685, 167],
        "11": [1477, 540, 663, 166]
      };
      var STATE_A_RECTS = {
        "0": [40, 40, 808, 185],
        "1": [924, 40, 810, 184],
        "2": [40, 257, 810, 185],
        "3": [926, 258, 809, 185]
      };
      var FIXED_TITLE_RECTS = {
        "4": [58, 431, 470, 198],
        "5": [574, 435, 479, 192],
        "6": [28, 656, 526, 147],
        "7": [593, 630, 466, 183]
      };
      var RESOURCE_RECTS = {
        "0": [50, 30, 1356, 340],
        "1": [50, 369, 1356, 330]
      };
      var GIFT_FRAME_RECT = [61, 162, 1151, 974];
      var UI_KEYS = exports('UI_KEYS', ['play', 'watch', 'collect', 'next', 'map', 'skins', 'bakery', 'gift', 'settings', 'home', 'revisit', 'pause', 'panel', 'resource', 'level', 'rarity']);
      var ITEM_TEXT = {
        "Picnic King Pip": ["items_01", 41, 48, 583, 146],
        "Cotton Tail Pip": ["items_01", 658, 48, 561, 147],
        "Clover Pip": ["items_01", 92, 237, 485, 152],
        "Honey Barnaby": ["items_01", 659, 240, 564, 153],
        "Russet Rosie": ["items_01", 56, 434, 548, 168],
        "Acorn Sammy": ["items_01", 666, 445, 544, 157],
        "Sprout Pip": ["items_01", 91, 639, 486, 158],
        "Daisy Pip": ["items_01", 716, 639, 457, 160],
        "Berry Pip": ["items_01", 99, 840, 479, 162],
        "Meadow Fox": ["items_01", 664, 841, 544, 158],
        "Orchard Badger": ["items_01", 40, 1043, 596, 157],
        "Sunflower Pip": ["items_01", 672, 1043, 555, 155],
        "Puddle Pip": ["items_02", 53, 61, 540, 164],
        "Baker Pip": ["items_02", 687, 58, 517, 170],
        "Lavender Pip": ["items_02", 37, 264, 580, 162],
        "Tart Chef Pip": ["items_02", 657, 265, 585, 160],
        "Moonflower Pip": ["items_02", 26, 467, 616, 156],
        "Royal Gardener": ["items_02", 659, 470, 577, 157],
        "Banquet Captain": ["items_02", 33, 659, 615, 156],
        "Festival Pip": ["items_02", 689, 665, 540, 162],
        "Sunny Meadow": ["items_02", 28, 871, 618, 158],
        "Berry Patch": ["items_02", 677, 869, 556, 161],
        "Honeycomb Terrace": ["items_02", 25, 1066, 629, 146],
        "Orchard Trellis": ["items_02", 662, 1066, 579, 140],
        "Sweet Briar": ["items_03", 66, 74, 533, 151],
        "Willow Brook": ["items_03", 660, 78, 564, 145],
        "Grand Banquet": ["items_03", 50, 270, 571, 148],
        "Clover Glade": ["items_03", 683, 273, 525, 141],
        "Strawberry Fields": ["items_03", 36, 469, 604, 148],
        "Golden Picnic": ["items_03", 684, 470, 534, 144],
        "Strawberry Tart": ["items_03", 39, 657, 573, 151],
        "Blueberry Scone": ["items_03", 667, 666, 564, 142],
        "Blackberry Custard": ["items_03", 39, 871, 593, 130],
        "Royal Gateau": ["items_03", 680, 863, 543, 148]
      };
      var FIXED_TITLES = ['Picnic Wardrobe', 'Berry Tart Bakery', 'Picnic Settings', 'Picnic paused', 'Picnic delivered!', 'Your picnic reward', 'Lovely work!', 'Oops! A little tumble', 'A new picnic trick', 'Picnic Gift', 'Rest and recharge', 'A new look for one picnic', 'Picnic visits'];
      var ArtLayer = exports('ArtLayer', /*#__PURE__*/function () {
        function ArtLayer() {
          this.beforeRetry = null;
          this.textures = new Map();
          this.frames = new Map();
          this.pending = new Map();
          this.failed = new Map();
          this.textureGen = new Map();
          this.popups = new Map();
          this.font = null;
          this.fontWait = [];
          this.fontLoading = false;
          this.fontFailed = false;
          this.fontGen = 0;
        }
        var _proto = ArtLayer.prototype;
        _proto.sprite = function sprite(parent, key, x, y, w, h, fit, name) {
          var _this = this;
          if (fit === void 0) {
            fit = 'contain';
          }
          var n = new Node(name || 'Art ' + key);
          n.layer = Layers.Enum.UI_2D;
          parent.addChild(n);
          n.addComponent(UITransform).setContentSize(w, h);
          n.setPosition(x, y);
          var s = n.addComponent(Sprite);
          s.sizeMode = Sprite.SizeMode.CUSTOM;
          var path = key === 'caption:gift' ? 'art/text/fixed_extra' : key.startsWith('ui:') ? 'art/ui/picnic_ui' : key.startsWith('glyph:') ? 'art/ui/picnic_glyphs' : key.startsWith('prop:') ? 'art/ui/picnic_props' : key.startsWith('button:') ? 'art/ui/picnic_buttons' : key.startsWith('action:') ? 'art/ui/picnic_actions' : key.startsWith('resource:') || key === 'energy:bolt' ? 'art/ui/picnic_resources' : key.startsWith('stateA:') ? 'art/ui/picnic_states_a' : key.startsWith('stateB:') ? 'art/ui/picnic_states_b' : key.startsWith('stateC:') ? 'art/ui/picnic_states_c' : key.startsWith('stateD:') ? 'art/ui/picnic_states_d' : key.startsWith('text:') ? 'art/text/' + key.split(':')[1] : key.startsWith('named:') ? 'art/text/' + ITEM_TEXT[key.slice(6)][0] : key.startsWith('recipe:') ? 'art/text/recipes' : key.startsWith('card:') ? 'art/ui/collection_cards' : key === 'counter:well' ? 'art/ui/counter_well' : key;
          var fallback = this.makeFallback(n, parent, name || '', w, h);
          this.texture(path, function (t) {
            if (!n.isValid) return;
            if (fallback != null && fallback.isValid) fallback.destroy();
            var rect;
            if (/^art\/gift\/frame_\d{2}$/.test(key)) {
              rect = _construct(Rect, GIFT_FRAME_RECT);
            } else if (key === 'counter:well') {
              rect = new Rect(30, 155, 2113, 414);
            } else if (key.startsWith('card:')) {
              rect = _construct(Rect, [[31, 18, 580, 584], [643, 18, 581, 584], [31, 633, 580, 583], [644, 633, 580, 583]][Number(key.slice(5))]);
            } else if (key === 'art/text/about') {
              rect = new Rect(0, 450, 1254, 380);
            } else if (key === 'energy:bolt') {
              rect = new Rect(40, 380, 430, 320);
            } else if (key === 'caption:gift') {
              rect = new Rect(0, 790, 1254, 440);
            } else if (key.startsWith('ui:')) {
              var r = UI_RECTS[UI_KEYS.indexOf(key.slice(3))] || UI_RECTS[12];
              rect = _construct(Rect, r);
            } else if (key.startsWith('glyph:')) {
              var chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+-/%!?.:'()&*=";
              var i = chars.indexOf(key.slice(6));
              var cw = t.width / 10,
                ch = t.height / 5;
              rect = new Rect(Math.floor(i % 10 * cw), Math.floor(Math.floor(i / 10) * ch), Math.floor(cw), Math.floor(ch));
            } else if (key.startsWith('recipe:')) {
              rect = _construct(Rect, [[0, 160, 1024, 310], [0, 480, 1024, 305], [0, 800, 1024, 310], [0, 1120, 1024, 310]][Number(key.slice(7))]);
            } else if (key.startsWith('named:')) {
              var _r = ITEM_TEXT[key.slice(6)].slice(1);
              rect = _construct(Rect, _r);
            } else if (key.startsWith('text:')) {
              var parts = key.split(':'),
                _i = Number(parts[2]);
              if (parts[1] === 'fixed_status') {
                rect = new Rect(0, _i * 418, 1254, 418);
              } else if (parts[1] === 'fixed_extra') {
                rect = _construct(Rect, [[0, 70, 1254, 420], [0, 520, 1254, 240], [0, 790, 1254, 440]][_i]);
              } else {
                var cols = 2,
                  rows = parts[1] === 'fixed_titles' ? 7 : 6,
                  _cw = t.width / cols;
                var _y = Math.floor(Math.floor(_i / cols) * t.height / rows);
                rect = new Rect(Math.floor(_i % cols * _cw), _y, Math.floor(_cw), Math.floor((Math.floor(_i / cols) + 1) * t.height / rows) - _y);
                if (parts[1] === 'fixed_titles' && FIXED_TITLE_RECTS[_i]) rect = _construct(Rect, FIXED_TITLE_RECTS[_i]);
              }
            } else if (key.startsWith('stateC:') || key.startsWith('stateD:')) {
              var _i2 = Number(key.slice(7)),
                _cw2 = t.width / 2,
                _ch = t.height / 2;
              rect = new Rect(Math.floor(_i2 % 2 * _cw2), Math.floor(Math.floor(_i2 / 2) * _ch), Math.floor(_cw2), Math.floor(_ch));
            } else if (key.startsWith('stateA:') || key.startsWith('stateB:')) {
              var _i3 = Number(key.slice(7)),
                _cw3 = t.width / 2,
                _ch2 = t.height / 4;
              rect = new Rect(Math.floor(_i3 % 2 * _cw3), Math.floor(Math.floor(_i3 / 2) * _ch2), Math.floor(_cw3), Math.floor(_ch2));
              if (key.startsWith('stateA:') && STATE_A_RECTS[_i3]) rect = _construct(Rect, STATE_A_RECTS[_i3]);
            } else if (key.startsWith('resource:')) {
              var _i4 = Number(key.slice(9)),
                _ch3 = t.height / 3;
              rect = new Rect(0, Math.floor(_i4 * _ch3), t.width, Math.floor(_ch3));
              if (RESOURCE_RECTS[_i4]) rect = _construct(Rect, RESOURCE_RECTS[_i4]);
            } else if (key.startsWith('action:')) {
              var _i5 = Number(key.slice(7)),
                _ch4 = t.height / 3;
              rect = new Rect(0, Math.floor(_i5 * _ch4), t.width, Math.floor(_ch4));
            } else if (key.startsWith('button:')) {
              var _i6 = Number(key.slice(7)),
                _cw4 = t.width / 3,
                _ch5 = t.height / 4;
              rect = new Rect(Math.floor(_i6 % 3 * _cw4), Math.floor(Math.floor(_i6 / 3) * _ch5), Math.floor(_cw4), Math.floor(_ch5));
              if (BUTTON_RECTS[_i6]) rect = _construct(Rect, BUTTON_RECTS[_i6]);
            } else if (key.startsWith('prop:')) {
              var _i7 = Number(key.slice(5)),
                _cw5 = t.width / 4,
                _ch6 = t.height / 4;
              if (_i7 === 0) rect = new Rect(35, 66, 349, 178);else if (_i7 === 1) rect = new Rect(486, 7, 193, 249);else rect = new Rect(Math.floor(_i7 % 4 * _cw5), Math.floor(Math.floor(_i7 / 4) * _ch6), Math.floor(_cw5), Math.floor(_ch6));
            } else rect = new Rect(0, 0, t.width, t.height);
            var cache = key + '|' + (name || '');
            var f = _this.frames.get(cache);
            if (!f) {
              f = new SpriteFrame();
              f.name = name || key;
              f.texture = t;
              f.rect = rect;
              _this.frames.set(cache, f);
            }
            s.spriteFrame = f;
            if (fit === 'stretch') {
              s.type = Sprite.Type.SLICED;
              f.insetLeft = f.insetRight = Math.min(rect.width * .12, 64, w * .22);
              f.insetTop = f.insetBottom = Math.min(rect.height * .12, 64, h * .22);
            }
            if (fit !== 'stretch') {
              var scale = fit === 'cover' ? Math.max(w / rect.width, h / rect.height) : Math.min(w / rect.width, h / rect.height);
              n.getComponent(UITransform).setContentSize(rect.width * scale, rect.height * scale);
            }
          });
          return n;
        };
        _proto.makeFallback = function makeFallback(n, parent, name, w, h) {
          var popup = false;
          for (var p = parent; p; p = p.parent) if (p.name.startsWith('Popup ')) {
            popup = true;
            break;
          }
          if (!popup) return null;
          var isPlate = name === 'PanelSurface',
            isControl = /^(btn_|icon_)/.test(name),
            isTitle = name.startsWith('txt_');
          if (!isPlate && !isControl && !isTitle) return null;
          var f = new Node('Art pending fallback');
          f.layer = Layers.Enum.UI_2D;
          n.addChild(f);
          f.addComponent(UITransform).setContentSize(w, h);
          if (isPlate || isControl) {
            var g = f.addComponent(Graphics);
            g.fillColor = new Color(isPlate ? 250 : 228, isPlate ? 230 : 207, isPlate ? 188 : 164, 255);
            g.strokeColor = new Color(143, 103, 70, 255);
            g.lineWidth = 3;
            g.roundRect(-w / 2, -h / 2, w, h, Math.min(22, h / 3));
            g.fill();
            g.stroke();
          }
          if (!isPlate) {
            var textNode = new Node('Fallback text');
            textNode.layer = Layers.Enum.UI_2D;
            f.addChild(textNode);
            textNode.addComponent(UITransform).setContentSize(w, h);
            var l = textNode.addComponent(Label);
            l.useSystemFont = true;
            l.fontSize = Math.min(isTitle ? 32 : 27, h * .5);
            l.lineHeight = l.fontSize * 1.25;
            l.color = new Color(86, 61, 45);
            l.string = name.replace(/^(btn_|icon_|txt_)/, '').replace(/_/g, ' ');
            l.horizontalAlign = Label.HorizontalAlign.CENTER;
            l.verticalAlign = Label.VerticalAlign.CENTER;
            l.overflow = Label.Overflow.SHRINK;
            l.enableWrapText = true;
          }
          return f;
        };
        _proto.popup = function popup(root, w, h) {
          var _this2 = this;
          var retry = new Node('Art recovery');
          retry.layer = Layers.Enum.UI_2D;
          root.addChild(retry);
          retry.addComponent(UITransform).setContentSize(320, 50);
          retry.setPosition(0, -590);
          var g = retry.addComponent(Graphics);
          g.fillColor = new Color(246, 225, 180);
          g.roundRect(-160, -25, 320, 50, 14);
          g.fill();
          var textNode = new Node('Retry artwork text');
          textNode.layer = Layers.Enum.UI_2D;
          retry.addChild(textNode);
          textNode.addComponent(UITransform).setContentSize(300, 46);
          var l = textNode.addComponent(Label);
          l.fontSize = 22;
          l.lineHeight = 28;
          l.color = new Color(85, 57, 37);
          l.string = 'Reload images';
          l.horizontalAlign = Label.HorizontalAlign.CENTER;
          l.verticalAlign = Label.VerticalAlign.CENTER;
          var owner = null;
          retry.on(Node.EventType.TOUCH_START, function (e) {
            e.propagationStopped = true;
            var id = e.getID();
            if (typeof id === 'number' && Number.isFinite(id)) owner = id;
          });
          retry.on(Node.EventType.TOUCH_END, function (e) {
            e.propagationStopped = true;
            if (owner === null || owner !== e.getID()) return;
            owner = null;
            if (retry.getComponent(UITransform).hitTest(e.getLocation())) _this2.retryDecorations();
          });
          retry.on(Node.EventType.TOUCH_CANCEL, function () {
            return owner = null;
          });
          this.popups.set(root, retry);
          this.tick();
        };
        _proto.status = function status() {
          return {
            pending: Array.from(this.pending.keys()),
            failed: Array.from(this.failed.keys()),
            fontPending: this.fontLoading,
            fontFailed: this.fontFailed
          };
        };
        _proto.tick = function tick() {
          for (var _iterator = _createForOfIteratorHelperLoose(this.popups), _step; !(_step = _iterator()).done;) {
            var _step$value = _step.value,
              root = _step$value[0],
              retry = _step$value[1];
            if (!root.isValid) {
              this.popups["delete"](root);
              continue;
            }
            retry.active = this.pending.size > 0 || this.failed.size > 0 || this.fontFailed || this.fontLoading;
          }
        };
        _proto.retryDecorations = function retryDecorations() {
          var _this$beforeRetry;
          (_this$beforeRetry = this.beforeRetry) == null || _this$beforeRetry.call(this);
          var requests = new Map(Array.from(this.failed.entries()).concat(Array.from(this.pending.entries())));
          this.failed.clear();
          this.pending.clear();
          for (var _iterator2 = _createForOfIteratorHelperLoose(requests), _step2; !(_step2 = _iterator2()).done;) {
            var _step2$value = _step2.value,
              _path = _step2$value[0],
              queue = _step2$value[1];
            this.textureGen.set(_path, (this.textureGen.get(_path) || 0) + 1);
            resources.release(_path + '/texture');
            for (var _iterator3 = _createForOfIteratorHelperLoose(queue), _step3; !(_step3 = _iterator3()).done;) {
              var cb = _step3.value;
              this.texture(_path, cb);
            }
          }
          if (this.fontFailed || this.fontLoading) {
            this.fontLoading = false;
            resources.release('art/ui/picnic_generated');
            this.beginFontLoad();
          }
          this.tick();
        };
        _proto.texture = function texture(path, cb) {
          var _this3 = this;
          var ready = this.textures.get(path);
          if (ready) {
            cb(ready);
            return;
          }
          if (this.pending.has(path)) {
            this.pending.get(path).push(cb);
            return;
          }
          if (this.failed.has(path)) {
            this.failed.get(path).push(cb);
            return;
          }
          this.pending.set(path, [cb]);
          var generation = (this.textureGen.get(path) || 0) + 1;
          this.textureGen.set(path, generation);
          resources.load(path + '/texture', Texture2D, function (err, t) {
            if (_this3.textureGen.get(path) !== generation) return;
            var queue = _this3.pending.get(path) || [];
            _this3.pending["delete"](path);
            if (err) {
              _this3.failed.set(path, queue);
              console.warn('Art resource unavailable', path, err.message);
              _this3.tick();
              return;
            }
            _this3.failed["delete"](path);
            _this3.textures.set(path, t);
            queue.forEach(function (fn) {
              return fn(t);
            });
            _this3.tick();
          });
        };
        _proto.prewarm = /*#__PURE__*/function () {
          var _prewarm = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime().mark(function _callee(paths, progress) {
            var _this4 = this;
            return _regeneratorRuntime().wrap(function _callee$(_context) {
              while (1) switch (_context.prev = _context.next) {
                case 0:
                  _context.next = 2;
                  return Promise.all(paths.map(function (path) {
                    return new Promise(function (resolve, reject) {
                      resources.load(path + '/texture', Texture2D, function (err, t) {
                        if (err) {
                          reject(err);
                          return;
                        }
                        _this4.textures.set(path, t);
                        var callbacks = [].concat(_this4.pending.get(path) || [], _this4.failed.get(path) || []);
                        _this4.pending["delete"](path);
                        _this4.failed["delete"](path);
                        _this4.textureGen.set(path, (_this4.textureGen.get(path) || 0) + 1);
                        callbacks.forEach(function (fn) {
                          return fn(t);
                        });
                        progress(path);
                        resolve();
                      });
                    });
                  }));
                case 2:
                  _context.next = 4;
                  return new Promise(function (resolve, reject) {
                    return resources.load('art/ui/picnic_generated', BitmapFont, function (err, font) {
                      if (err) {
                        reject(err);
                        return;
                      }
                      _this4.font = font;
                      _this4.fontFailed = false;
                      _this4.fontLoading = false;
                      _this4.fontGen++;
                      var callbacks = _this4.fontWait.splice(0);
                      callbacks.forEach(function (fn) {
                        return fn(font);
                      });
                      progress('art/ui/picnic_generated');
                      resolve();
                    });
                  });
                case 4:
                case "end":
                  return _context.stop();
              }
            }, _callee);
          }));
          function prewarm(_x, _x2) {
            return _prewarm.apply(this, arguments);
          }
          return prewarm;
        }();
        _proto.loadFont = function loadFont(cb) {
          if (this.font) {
            cb(this.font);
            return;
          }
          this.fontWait.push(cb);
          this.beginFontLoad();
        };
        _proto.beginFontLoad = function beginFontLoad() {
          var _this5 = this;
          if (this.fontLoading) return;
          this.fontLoading = true;
          this.fontFailed = false;
          var generation = ++this.fontGen;
          resources.load('art/ui/picnic_generated', BitmapFont, function (err, font) {
            if (_this5.fontGen !== generation) return;
            _this5.fontLoading = false;
            if (err) {
              _this5.fontFailed = true;
              console.warn('Generated font load failed', err);
              _this5.tick();
              return;
            }
            var q = _this5.fontWait.splice(0);
            _this5.font = font;
            q.forEach(function (fn) {
              return fn(font);
            });
            _this5.tick();
          });
        };
        _proto.text = function text(parent, value, x, y, size, w, h) {
          var fixed = FIXED_TITLES.indexOf(value);
          var extra = value === 'Picnic Trail' ? 0 : value === 'Hold to march. Let go to wait.' ? 1 : -1;
          var status = value === 'Your treats are safely packed!' ? 0 : value === 'Setting the picnic table...' ? 1 : value === 'Checking video…' || value === 'Checking video...' ? 2 : -1;
          var fullKey = status >= 0 ? 'text:fixed_status:' + status : ITEM_TEXT[value] ? 'named:' + value : extra >= 0 ? 'text:fixed_extra:' + extra : fixed >= 0 ? 'text:fixed_titles:' + fixed : '';
          if (fullKey) {
            var node = this.sprite(parent, fullKey, x, y, w, h, 'contain', 'txt_' + value.replace(/[^a-z0-9]+/gi, '_'));
            return {
              node: node,
              get string() {
                return value;
              },
              set string(v) {}
            };
          }
          var n = new Node('txt_' + value.replace(/[^a-z0-9]+/gi, '_'));
          n.layer = Layers.Enum.UI_2D;
          parent.addChild(n);
          n.addComponent(UITransform).setContentSize(w, h);
          n.setPosition(x, y);
          var l = n.addComponent(Label);
          l.enabled = true;
          l.useSystemFont = true;
          var artColor = /^[0-9]+$/.test(value) || value.includes('Carrot Coins') ? new Color(255, 170, 255) : size >= 34 ? new Color(255, 210, 230) : /^[0-9+/% -]+$/.test(value) ? new Color(255, 238, 188) : new Color(255, 250, 232);
          l.color = new Color(86, 61, 45);
          l.fontSize = size; // Cocos 3.8 BMFont SHRINK multiplies lineHeight by fontSize/originalSize.
          // Supply source-font units (140 * 1.25), not already-scaled display pixels.
          l.lineHeight = size * 1.25;
          l.horizontalAlign = Label.HorizontalAlign.CENTER;
          l.verticalAlign = Label.VerticalAlign.CENTER;
          l.overflow = Label.Overflow.SHRINK;
          l.enableWrapText = true;
          var clean = function clean(str) {
            return str.toUpperCase().replace(/[×→]/g, '+').replace(/[·–—]/g, '-').replace(/★/g, '*').replace(/…/g, '...');
          };
          var current = value;
          l.string = clean(value);
          this.loadFont(function (f) {
            if (!n.isValid) return;
            l.useSystemFont = false;
            l.font = f;
            l.lineHeight = 175;
            l.color = artColor;
            l.enabled = true;
          });
          return {
            node: n,
            get string() {
              return current;
            },
            set string(v) {
              current = v;
              l.string = clean(v);
              if (!n.name.startsWith('runtime_')) n.name = 'txt_' + v.replace(/[^a-z0-9]+/gi, '_').slice(0, 80);
            }
          };
        };
        _proto.opacity = function opacity(n, enabled) {
          if (!enabled) {
            for (var _iterator4 = _createForOfIteratorHelperLoose(n.children), _step4; !(_step4 = _iterator4()).done;) {
              var child = _step4.value;
              if (child.getComponent(Sprite)) {
                var opacity = child.getComponent(UIOpacity) || child.addComponent(UIOpacity);
                opacity.opacity = 125;
              }
            }
          }
        };
        return ArtLayer;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/AudioBridge.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameAudioManager.ts'], function (exports) {
  var _createClass, cclegacy, GameAudioManager;
  return {
    setters: [function (module) {
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
    }, function (module) {
      GameAudioManager = module.GameAudioManager;
    }],
    execute: function () {
      cclegacy._RF.push({}, "5765fe6Fb5GAZHJf3bZBpAZ", "AudioBridge", undefined);

      /** Small event adapter; gameplay owns when these events occur. */
      var AudioBridge = exports('AudioBridge', /*#__PURE__*/function () {
        function AudioBridge() {}
        AudioBridge.init = function init() {
          var am = this.manager;
          am.preload();
          am.playBGM('bgm_menu');
        };
        AudioBridge.gesture = function gesture() {
          this.manager.unlock();
        };
        AudioBridge.scene = function scene(_scene, level) {
          if (level === void 0) {
            level = 1;
          }
          if (_scene === 'game') this.manager.playLevelBGM(level);else this.manager.playBGM('bgm_menu');
        };
        AudioBridge.click = function click() {
          this.gesture();
          this.manager.playSFX('sfx_ui_click');
        };
        AudioBridge.step = function step() {
          this.manager.playSFX('sfx_march_step');
        };
        AudioBridge.halt = function halt() {
          this.manager.playSFX('sfx_critter_halt');
        };
        AudioBridge.hazard = function hazard(kind) {
          this.manager.playSFX({
            whisk: 'sfx_whisk_spin',
            rolling: 'sfx_rolling_pin_rumble',
            honey: 'sfx_honey_splash'
          }[kind]);
        };
        AudioBridge.pickup = function pickup() {
          this.manager.playSFX('sfx_pastry_pickup');
        };
        AudioBridge.basket = function basket(combo) {
          if (combo === void 0) {
            combo = 1;
          }
          this.manager.playSFX('sfx_basket_arrive');
          if (combo > 1) this.manager.playCombo(combo);
        };
        AudioBridge.coins = function coins(count) {
          if (count === void 0) {
            count = 1;
          }
          this.manager.playCoins(count);
        };
        AudioBridge.star = function star(index) {
          this.manager.playStar(index);
        };
        AudioBridge.win = function win() {
          this.manager.playJingle('jingle_win');
        };
        AudioBridge.lose = function lose() {
          this.manager.playJingle('jingle_lose');
        };
        AudioBridge.revive = function revive() {
          this.manager.playSFX('sfx_revive_chime');
        };
        AudioBridge.pause = function pause(reason) {
          this.manager.pause(reason);
        };
        AudioBridge.resume = function resume(reason) {
          this.manager.resume(reason);
        };
        _createClass(AudioBridge, null, [{
          key: "manager",
          get: function get() {
            return GameAudioManager.init();
          }
        }]);
        return AudioBridge;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameAudioButton.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameAudioManager.ts'], function (exports) {
  var _applyDecoratedDescriptor, _inheritsLoose, _initializerDefineProperty, _assertThisInitialized, cclegacy, _decorator, Button, Component, GameAudioManager;
  return {
    setters: [function (module) {
      _applyDecoratedDescriptor = module.applyDecoratedDescriptor;
      _inheritsLoose = module.inheritsLoose;
      _initializerDefineProperty = module.initializerDefineProperty;
      _assertThisInitialized = module.assertThisInitialized;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Button = module.Button;
      Component = module.Component;
    }, function (module) {
      GameAudioManager = module.GameAudioManager;
    }],
    execute: function () {
      var _dec, _class, _class2, _descriptor;
      cclegacy._RF.push({}, "e7796ge9gZCPJxJcJLtjct7", "GameAudioButton", undefined);
      var ccclass = _decorator.ccclass,
        property = _decorator.property;
      var GameAudioButton = exports('GameAudioButton', (_dec = ccclass('GameAudioButton'), _dec(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameAudioButton, _Component);
        function GameAudioButton() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _initializerDefineProperty(_this, "soundId", _descriptor, _assertThisInitialized(_this));
          return _this;
        }
        var _proto = GameAudioButton.prototype;
        _proto.onEnable = function onEnable() {
          this.node.on(Button.EventType.CLICK, this.onClick, this);
        };
        _proto.onDisable = function onDisable() {
          this.node.off(Button.EventType.CLICK, this.onClick, this);
        };
        _proto.onClick = function onClick() {
          var btn = this.getComponent(Button);
          if (btn && !btn.interactable) return;
          var am = GameAudioManager.instance;
          if (!am) return;
          am.unlock();
          am.playSFX(this.soundId);
        };
        GameAudioButton.attachAll = function attachAll(root) {
          root.getComponentsInChildren(Button).forEach(function (btn) {
            if (btn.getComponent(GameAudioButton)) return;
            var bs = btn.addComponent(GameAudioButton);
            if (/back|close|cancel|返回|关闭/i.test(btn.node.name)) bs.soundId = 'sfx_ui_back';
          });
        };
        return GameAudioButton;
      }(Component), _descriptor = _applyDecoratedDescriptor(_class2.prototype, "soundId", [property], {
        configurable: true,
        enumerable: true,
        writable: true,
        initializer: function initializer() {
          return 'sfx_ui_click';
        }
      }), _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameAudioConfig.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "56b50UZrQ1B5787l53Tefxb", "GameAudioConfig", undefined); // ⚠️ 本文件由 process_audio.py 自动生成，不要手改。改音频请重新运行脚本。
      var BGM = exports('BGM', {
        bgm_menu: {
          path: 'audio/bgm/bgm_menu',
          volume: 0.65
        },
        bgm_game: {
          path: 'audio/bgm/bgm_game',
          volume: 0.52
        },
        jingle_win: {
          path: 'audio/bgm/jingle_win',
          volume: 0.75
        },
        jingle_lose: {
          path: 'audio/bgm/jingle_lose',
          volume: 0.5
        }
      });
      var SFX = exports('SFX', {
        sfx_ui_click: {
          path: 'audio/sfx/sfx_ui_click',
          variants: 3,
          volume: 0.65
        },
        sfx_march_step: {
          path: 'audio/sfx/sfx_march_step',
          variants: 3,
          volume: 0.38
        },
        sfx_critter_halt: {
          path: 'audio/sfx/sfx_critter_halt',
          volume: 0.45
        },
        sfx_whisk_spin: {
          path: 'audio/sfx/sfx_whisk_spin',
          volume: 0.4
        },
        sfx_basket_arrive: {
          path: 'audio/sfx/sfx_basket_arrive',
          volume: 0.65
        },
        sfx_combo_1: {
          path: 'audio/sfx/sfx_combo_1',
          volume: 0.6
        },
        sfx_combo_2: {
          path: 'audio/sfx/sfx_combo_2',
          volume: 0.6
        },
        sfx_combo_3: {
          path: 'audio/sfx/sfx_combo_3',
          volume: 0.6
        },
        sfx_combo_4: {
          path: 'audio/sfx/sfx_combo_4',
          volume: 0.6
        },
        sfx_combo_5: {
          path: 'audio/sfx/sfx_combo_5',
          volume: 0.6
        },
        sfx_star_1: {
          path: 'audio/sfx/sfx_star_1',
          volume: 0.6
        },
        sfx_star_2: {
          path: 'audio/sfx/sfx_star_2',
          volume: 0.6
        },
        sfx_star_3: {
          path: 'audio/sfx/sfx_star_3',
          volume: 0.6
        },
        sfx_revive_chime: {
          path: 'audio/sfx/sfx_revive_chime',
          volume: 0.7
        },
        sfx_pastry_pickup: {
          path: 'audio/sfx/sfx_pastry_pickup',
          variants: 3,
          volume: 0.6
        },
        sfx_honey_splash: {
          path: 'audio/sfx/sfx_honey_splash',
          volume: 0.45
        },
        sfx_rolling_pin_rumble: {
          path: 'audio/sfx/sfx_rolling_pin_rumble',
          volume: 0.4
        },
        sfx_coin: {
          path: 'audio/sfx/sfx_coin',
          variants: 3,
          volume: 0.6
        },
        sfx_invalid: {
          path: 'audio/sfx/sfx_invalid',
          volume: 0.4
        }
      });
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameAudioManager.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameAudioConfig.ts'], function (exports) {
  var _inheritsLoose, _createClass, cclegacy, _decorator, Node, director, AudioSource, sys, game, Game, input, Input, Tween, assetManager, AudioClip, tween, Component, BGM, SFX;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Node = module.Node;
      director = module.director;
      AudioSource = module.AudioSource;
      sys = module.sys;
      game = module.game;
      Game = module.Game;
      input = module.input;
      Input = module.Input;
      Tween = module.Tween;
      assetManager = module.assetManager;
      AudioClip = module.AudioClip;
      tween = module.tween;
      Component = module.Component;
    }, function (module) {
      BGM = module.BGM;
      SFX = module.SFX;
    }],
    execute: function () {
      var _dec, _class, _class2;
      cclegacy._RF.push({}, "4113fp8SwhIZaRSvAnzLfr6", "GameAudioManager", undefined);
      var ccclass = _decorator.ccclass;
      var KEY = 'pips_picnic_audio_settings_v1';
      var BGM_BASE = 0.5; // BGM 一定要比音效小
      var SFX_BASE = 0.8;
      var JINGLE_BASE = 0.8; // 过关/失败短音乐属于"音乐"，跟音乐开关和音乐音量
      var SFX_MIN_INTERVAL = 50; // 同一音效两次播放最小间隔（毫秒）
      var SFX_MAX_CONCURRENT = 6; // 同时播放的音效上限

      // 可选音效没做时，自动用相近的音效代替，游戏代码可以放心调用标准 ID
      var FALLBACK = {
        sfx_ui_back: 'sfx_ui_click',
        sfx_ui_toggle: 'sfx_ui_click',
        sfx_ui_locked: 'sfx_invalid',
        sfx_ui_popup_close: 'sfx_ui_popup_open',
        sfx_ui_popup_open: 'sfx_ui_click',
        sfx_swap: 'sfx_select',
        sfx_hint: 'sfx_reward',
        sfx_shuffle: 'sfx_swap',
        sfx_booster: 'sfx_reward',
        sfx_clear_big: 'sfx_match',
        sfx_reward_ad: 'sfx_reward',
        sfx_unlock: 'sfx_reward',
        sfx_time_up: 'sfx_invalid',
        sfx_heart_lose: 'sfx_invalid',
        sfx_level_start: 'sfx_ui_popup_open',
        sfx_spin: 'sfx_coin',
        sfx_select: 'sfx_ui_click',
        sfx_place: 'sfx_select'
      };
      var GameAudioManager = exports('GameAudioManager', (_dec = ccclass('GameAudioManager'), _dec(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameAudioManager, _Component);
        function GameAudioManager() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.bgmSource = void 0;
          _this.jingleSource = void 0;
          _this.voices = [];
          _this.requestVersion = 0;
          _this.soundVersion = 0;
          _this.jingleTimer = null;
          _this.clips = new Map();
          _this.audioBundle = null;
          _this.bundleLoading = false;
          _this.bundleWaiters = [];
          _this.clipWaiters = new Map();
          _this.destroyed = false;
          _this.lastPlayTime = new Map();
          _this.lastVariant = new Map();
          _this.currentBgm = '';
          _this.pendingBgm = '';
          _this.unlocked = false;
          _this.pauseReasons = new Set();
          _this.fade = {
            v: 0
          };
          _this.settings = {
            musicOn: true,
            sfxOn: true,
            musicLevel: 10,
            sfxLevel: 10
          };
          return _this;
        }
        /** 在启动场景调用一次；没有挂在场景里时会自动创建常驻节点 */
        GameAudioManager.init = function init() {
          if (GameAudioManager.instance) return GameAudioManager.instance;
          var node = new Node('GameAudioManager');
          director.getScene().addChild(node);
          return node.addComponent(GameAudioManager);
        };
        var _proto = GameAudioManager.prototype;
        _proto.onLoad = function onLoad() {
          if (GameAudioManager.instance && GameAudioManager.instance !== this) {
            this.node.destroy();
            return;
          }
          GameAudioManager.instance = this;
          director.addPersistRootNode(this.node);
          this.bgmSource = this.node.addComponent(AudioSource);
          this.bgmSource.loop = true;
          this.bgmSource.playOnAwake = false;
          this.jingleSource = this.node.addComponent(AudioSource);
          this.jingleSource.playOnAwake = false;
          for (var i = 0; i < SFX_MAX_CONCURRENT; i++) {
            var source = this.node.addComponent(AudioSource);
            source.playOnAwake = false;
            this.voices.push(source);
          }
          this.loadSettings();

          // 浏览器要求第一次点击后才能出声；TikTok/原生环境可以直接播
          this.unlocked = !sys.isBrowser;
          game.on(Game.EVENT_HIDE, this.onHide, this);
          game.on(Game.EVENT_SHOW, this.onShow, this);
          input.once(Input.EventType.TOUCH_START, this.unlock, this);
          input.once(Input.EventType.MOUSE_DOWN, this.unlock, this);
        };
        _proto.onDestroy = function onDestroy() {
          this.destroyed = true;
          this.requestVersion++;
          this.soundVersion++;
          this.cancelJingleTimer();
          this.unscheduleAllCallbacks();
          Tween.stopAllByTarget(this.fade);
          this.bundleWaiters.splice(0).forEach(function (done) {
            return done(null);
          });
          game.off(Game.EVENT_HIDE, this.onHide, this);
          game.off(Game.EVENT_SHOW, this.onShow, this);
          input.off(Input.EventType.TOUCH_START, this.unlock, this);
          input.off(Input.EventType.MOUSE_DOWN, this.unlock, this);
          if (GameAudioManager.instance === this) GameAudioManager.instance = null;
        }

        /** 玩家第一次点击屏幕时自动调用；按钮音组件也会调用，保证第一下就能出声 */;
        _proto.unlock = function unlock() {
          if (this.unlocked) return;
          this.unlocked = true;
          if (this.pendingBgm) {
            var id = this.pendingBgm;
            this.pendingBgm = '';
            this.playBGM(id);
          }
        }

        // ---------------------------------------------------------- 设置（开关 + 11 档音量，自动保存）
        ;

        _proto.loadSettings = function loadSettings() {
          try {
            var raw = sys.localStorage.getItem(KEY);
            if (raw) {
              var s = JSON.parse(raw);
              this.settings.musicOn = s.musicOn !== false;
              this.settings.sfxOn = s.sfxOn !== false;
              this.settings.musicLevel = this.clampLevel(s.musicLevel, 10);
              this.settings.sfxLevel = this.clampLevel(s.sfxLevel, 10);
            }
          } catch (e) {
            console.warn('[Audio] 设置读取失败，使用默认值', e);
          }
        };
        _proto.saveSettings = function saveSettings() {
          try {
            sys.localStorage.setItem(KEY, JSON.stringify(this.settings));
          } catch (e) {
            console.warn('[Audio] 设置保存失败', e);
          }
        };
        _proto.clampLevel = function clampLevel(v, def) {
          if (typeof v !== 'number' || !isFinite(v)) return def;
          var n = Math.round(v);
          return isFinite(n) ? Math.max(0, Math.min(10, n)) : def;
        };
        _proto.setMusic = function setMusic(on) {
          this.settings.musicOn = on;
          this.saveSettings();
          var id = this.currentBgm || 'bgm_menu';
          this.requestVersion++;
          this.jingleSource.stop();
          this.cancelJingleTimer();
          if (on) {
            this.currentBgm = '';
            this.playBGM(id);
          } else {
            Tween.stopAllByTarget(this.fade);
            this.bgmSource.stop();
            this.currentBgm = id;
          }
        };
        _proto.setSFX = function setSFX(on) {
          this.settings.sfxOn = on;
          this.saveSettings();
          this.soundVersion++;
          if (!on) this.voices.forEach(function (source) {
            return source.stop();
          });
        }

        /** 音乐音量档位 0–10；只改音量，不改开关 */;
        _proto.setMusicLevel = function setMusicLevel(level) {
          this.settings.musicLevel = this.clampLevel(level, this.settings.musicLevel);
          this.saveSettings();
          this.jingleSource.volume = JINGLE_BASE * this.musicScale();
          if (this.bgmSource.playing) {
            Tween.stopAllByTarget(this.fade);
            this.bgmSource.volume = this.bgmTarget(BGM[this.currentBgm]);
          }
        }

        /** 音效音量档位 0–10；只改音量，不改开关 */;
        _proto.setSFXLevel = function setSFXLevel(level) {
          this.settings.sfxLevel = this.clampLevel(level, this.settings.sfxLevel);
          this.saveSettings();
        };
        _proto.musicScale = function musicScale() {
          return this.settings.musicLevel / 10;
        };
        _proto.sfxScale = function sfxScale() {
          return this.settings.sfxLevel / 10;
        }

        // ---------------------------------------------------------- 加载

        /** Warm only bundle metadata. UI startup never waits for audio media. */;
        _proto.preload = function preload(onDone) {
          this.getBundle(function () {
            return onDone && onDone();
          });
        };
        _proto.getBundle = function getBundle(cb) {
          var _this2 = this;
          if (this.destroyed) {
            cb(null);
            return;
          }
          var ready = this.audioBundle || assetManager.getBundle('game_audio');
          if (ready) {
            this.audioBundle = ready;
            cb(ready);
            return;
          }
          this.bundleWaiters.push(cb);
          if (this.bundleLoading) return;
          this.bundleLoading = true;
          assetManager.loadBundle('game_audio', function (err, bundle) {
            _this2.bundleLoading = false;
            var readyBundle = !err && bundle && !_this2.destroyed ? bundle : null;
            _this2.audioBundle = readyBundle;
            if (err && !_this2.destroyed) console.warn('[Audio] Bundle unavailable; next audio event can retry', err);
            _this2.bundleWaiters.splice(0).forEach(function (done) {
              return done(readyBundle);
            });
          });
        };
        _proto.getClip = function getClip(path, cb) {
          var _this3 = this;
          var cached = this.clips.get(path);
          if (cached) {
            cb(cached);
            return;
          }
          var waiting = this.clipWaiters.get(path);
          if (waiting) {
            waiting.push(cb);
            return;
          }
          this.clipWaiters.set(path, [cb]);
          var finish = function finish(clip) {
            var done = _this3.clipWaiters.get(path) || [];
            _this3.clipWaiters["delete"](path);
            done.forEach(function (next) {
              return next(clip);
            });
          };
          this.getBundle(function (bundle) {
            if (!bundle || _this3.destroyed) {
              finish(null);
              return;
            }
            bundle.load(path, AudioClip, function (err, clip) {
              if (_this3.destroyed) {
                finish(null);
                return;
              }
              if (err || !clip) {
                console.warn('[Audio] Clip unavailable', path);
                finish(null);
                return;
              }
              _this3.clips.set(path, clip);
              finish(clip);
            });
          });
        }

        /** 多版本随机播放，且不连续两次播同一个版本 */;
        _proto.pickVariant = function pickVariant(id, e) {
          if (!e.variants || e.variants <= 1) return e.path;
          var i = 1 + Math.floor(Math.random() * e.variants);
          if (i === this.lastVariant.get(id)) i = i % e.variants + 1;
          this.lastVariant.set(id, i);
          return e.path + "_" + i;
        }

        // ---------------------------------------------------------- BGM
        ;

        _proto.playBGM = function playBGM(id, fadeIn) {
          var _this4 = this;
          if (fadeIn === void 0) {
            fadeIn = 0.5;
          }
          var e = BGM[id];
          if (!e) {
            console.warn('[Audio] 未知 BGM', id);
            return;
          }
          if (!this.unlocked) {
            this.pendingBgm = id;
            return;
          }
          this.cancelJingleTimer();
          this.jingleSource.stop();
          if (this.currentBgm === id && this.bgmSource.playing) {
            this.fadeTo(this.bgmTarget(e), 0.3);
            return;
          }
          this.currentBgm = id;
          var version = ++this.requestVersion;
          if (!this.settings.musicOn || this.pauseReasons.size) return;
          var start = function start() {
            return _this4.getClip(e.path, function (clip) {
              if (!clip || _this4.requestVersion !== version || _this4.currentBgm !== id || _this4.pauseReasons.size || !_this4.settings.musicOn) return;
              _this4.bgmSource.stop();
              _this4.bgmSource.clip = clip;
              _this4.bgmSource.loop = true;
              _this4.bgmSource.volume = 0;
              _this4.bgmSource.play();
              _this4.fadeTo(_this4.bgmTarget(e), fadeIn);
            });
          };
          // 有正在播的 BGM：先淡出再切，不会两首叠在一起
          if (this.bgmSource.playing) this.fadeTo(0, 0.3, start);else start();
        }

        /** 关卡 BGM 轮换：有 bgm_game_2 时奇偶关交替，减少听腻 */;
        _proto.playLevelBGM = function playLevelBGM(level) {
          var id = BGM['bgm_game_2'] && level % 2 === 0 ? 'bgm_game_2' : 'bgm_game';
          this.playBGM(BGM[id] ? id : 'bgm_menu');
        };
        _proto.stopBGM = function stopBGM(fadeOut) {
          var _this5 = this;
          if (fadeOut === void 0) {
            fadeOut = 0.3;
          }
          this.requestVersion++;
          this.pendingBgm = '';
          this.cancelJingleTimer();
          this.currentBgm = '';
          this.fadeTo(0, fadeOut, function () {
            return _this5.bgmSource.stop();
          });
        }

        /** A result cue replaces gameplay BGM and restores menu music when complete. */;
        _proto.playJingle = function playJingle(id) {
          var _this6 = this;
          var e = BGM[id];
          if (!e) {
            console.warn('[Audio] 未知 jingle', id);
            return;
          }
          this.cancelJingleTimer();
          var version = ++this.requestVersion;
          Tween.stopAllByTarget(this.fade);
          this.bgmSource.stop();
          this.currentBgm = '';
          this.pendingBgm = '';
          this.jingleSource.stop();
          if (!this.settings.musicOn || this.pauseReasons.size || !this.unlocked) return;
          this.getClip(e.path, function (clip) {
            var _e$volume;
            if (!clip || version !== _this6.requestVersion || !_this6.settings.musicOn || _this6.pauseReasons.size) return;
            _this6.jingleSource.clip = clip;
            _this6.jingleSource.loop = false;
            _this6.jingleSource.volume = JINGLE_BASE * _this6.musicScale() * ((_e$volume = e.volume) != null ? _e$volume : 1);
            _this6.jingleSource.play();
            _this6.jingleTimer = function () {
              _this6.jingleTimer = null;
              _this6.playBGM('bgm_menu');
            };
            _this6.scheduleOnce(_this6.jingleTimer, clip.getDuration());
          });
        };
        _proto.cancelJingleTimer = function cancelJingleTimer() {
          if (this.jingleTimer) this.unschedule(this.jingleTimer);
          this.jingleTimer = null;
        };
        _proto.bgmTarget = function bgmTarget(e) {
          var _e$volume2;
          return BGM_BASE * this.musicScale() * ((_e$volume2 = e == null ? void 0 : e.volume) != null ? _e$volume2 : 1);
        };
        _proto.fadeTo = function fadeTo(to, duration, done) {
          var _this7 = this;
          Tween.stopAllByTarget(this.fade);
          this.fade.v = this.bgmSource.volume;
          tween(this.fade).to(duration, {
            v: to
          }, {
            onUpdate: function onUpdate() {
              _this7.bgmSource.volume = _this7.fade.v;
            }
          }).call(function () {
            return done && done();
          }).start();
        }

        // ---------------------------------------------------------- 音效
        ;

        _proto.playSFX = function playSFX(id, volumeScale) {
          var _this$lastPlayTime$ge,
            _this8 = this;
          if (volumeScale === void 0) {
            volumeScale = 1;
          }
          if (!this.settings.sfxOn || !this.unlocked || this.pauseReasons.size) return;
          var guard = 0;
          while (!SFX[id] && FALLBACK[id] && guard++ < 4) id = FALLBACK[id];
          var e = SFX[id];
          if (!e) {
            console.warn('[Audio] 未知音效', id);
            return;
          }
          var now = Date.now();
          if (now - ((_this$lastPlayTime$ge = this.lastPlayTime.get(id)) != null ? _this$lastPlayTime$ge : 0) < SFX_MIN_INTERVAL) return;
          this.lastPlayTime.set(id, now);
          var version = this.soundVersion;
          this.getClip(this.pickVariant(id, e), function (clip) {
            var _e$volume3;
            if (!clip || version !== _this8.soundVersion || !_this8.settings.sfxOn || _this8.pauseReasons.size) return;
            var source = _this8.voices.find(function (voice) {
              return !voice.playing;
            });
            if (!source) return;
            source.clip = clip;
            source.loop = false;
            source.volume = SFX_BASE * _this8.sfxScale() * ((_e$volume3 = e.volume) != null ? _e$volume3 : 1) * volumeScale;
            source.play();
          });
        }

        /** 连击：level 从 1 开始；超过最高级就一直用最高级 */;
        _proto.playCombo = function playCombo(level) {
          var max = 0;
          while (SFX["sfx_combo_" + (max + 1)]) max++;
          if (max === 0) {
            this.playSFX('sfx_match');
            return;
          }
          this.playSFX("sfx_combo_" + Math.min(Math.max(level, 1), max));
        }

        /** 结算星星：index 从 1 开始，跟着星星动画逐个调用 */;
        _proto.playStar = function playStar(index) {
          this.playSFX(SFX["sfx_star_" + index] ? "sfx_star_" + index : 'sfx_star_1');
        }

        /** 连续获得多个金币：依次播放，不叠在一起 */;
        _proto.playCoins = function playCoins(count) {
          var _this9 = this;
          var version = this.soundVersion;
          var n = Math.min(count, 8);
          var _loop = function _loop(i) {
            _this9.scheduleOnce(function () {
              if (version === _this9.soundVersion) _this9.playSFX('sfx_coin', 1 - i * 0.05);
            }, i * 0.06);
          };
          for (var i = 0; i < n; i++) {
            _loop(i);
          }
        }

        // ---------------------------------------------------------- 暂停（按原因记录）

        /** 激励视频播放前调用 pause('ad')，关闭后调用 resume('ad')；其他原因（如暂停菜单）自定名字 */;
        _proto.pause = function pause(reason) {
          this.pauseReasons.add(reason);
          this.requestVersion++;
          this.soundVersion++;
          Tween.stopAllByTarget(this.fade);
          if (this.jingleTimer || this.jingleSource.playing) this.currentBgm = 'bgm_menu';
          this.cancelJingleTimer();
          this.jingleSource.stop();
          this.voices.forEach(function (source) {
            return source.stop();
          });
          this.bgmSource.pause();
        };
        _proto.resume = function resume(reason) {
          this.pauseReasons["delete"](reason);
          if (this.pauseReasons.size) return;
          if (this.settings.musicOn && this.currentBgm && this.unlocked) {
            var id = this.currentBgm;
            this.currentBgm = '';
            this.playBGM(id);
          }
        }

        /** 旧接口：等同 pause('ad') / resume('ad') */;
        _proto.pauseAll = function pauseAll() {
          this.pause('ad');
        };
        _proto.resumeAll = function resumeAll() {
          this.resume('ad');
        };
        _proto.onHide = function onHide() {
          this.pause('hide');
        };
        _proto.onShow = function onShow() {
          this.resume('hide');
        };
        _createClass(GameAudioManager, [{
          key: "musicOn",
          get: function get() {
            return this.settings.musicOn;
          }
        }, {
          key: "sfxOn",
          get: function get() {
            return this.settings.sfxOn;
          }
        }, {
          key: "musicLevel",
          get: function get() {
            return this.settings.musicLevel;
          } // 0–10，界面显示为 0%–100%
        }, {
          key: "sfxLevel",
          get: function get() {
            return this.settings.sfxLevel;
          }
        }]);
        return GameAudioManager;
      }(Component), _class2.instance = void 0, _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/JsonTransportGuard.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _extends, _createForOfIteratorHelperLoose, cclegacy, assetManager;
  return {
    setters: [function (module) {
      _extends = module.extends;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      assetManager = module.assetManager;
    }],
    execute: function () {
      cclegacy._RF.push({}, "343a8uN9FlLWY1WMZkv6K9B", "JsonTransportGuard", undefined);
      // Keep the engine downloader/parser contract, but settle a stalled JSON transport once.
      // This releases Cocos' in-flight task so a player's first Retry can start a fresh request.
      var JsonTransportGuard = exports('JsonTransportGuard', /*#__PURE__*/function () {
        function JsonTransportGuard() {
          this.pending = [];
          this.original = void 0;
          this.handler = void 0;
          this.previousRetries = 0;
        }
        var _proto = JsonTransportGuard.prototype;
        _proto.install = function install() {
          var _this = this;
          this.previousRetries = assetManager.downloader.maxRetryCount;
          assetManager.downloader.maxRetryCount = 0;
          this.original = assetManager.downloader.handlers['.json'];
          var original = this.original;
          this.handler = function (url, options, callback) {
            if (!String(url).includes('assets/resources/')) return original(url, options, callback);
            var item = {
              url: url,
              last: Date.now(),
              done: false
            };
            _this.pending.push(item);
            var finish = function finish(error, result) {
              if (item.done) return;
              item.done = true;
              callback(error, result);
            };
            item.fail = function () {
              return finish(new Error('Picnic data request stopped making progress'));
            };
            var progress = options.onFileProgress;
            var opts = _extends({}, options, {
              maxRetryCount: 0,
              xhrTimeout: 13000,
              onFileProgress: function onFileProgress(loaded, total) {
                if (loaded > (item.loaded || 0)) {
                  item.loaded = loaded;
                  item.last = Date.now();
                }
                progress == null || progress(loaded, total);
              }
            });
            return original(url, opts, finish);
          };
          assetManager.downloader.register('.json', this.handler);
        };
        _proto.tick = function tick() {
          var now = Date.now();
          for (var _iterator = _createForOfIteratorHelperLoose(this.pending), _step; !(_step = _iterator()).done;) {
            var item = _step.value;
            if (!item.done && now - item.last > 13500) item.fail();
          }
          this.pending = this.pending.filter(function (item) {
            return !item.done;
          });
        };
        _proto.resume = function resume() {
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.pending), _step2; !(_step2 = _iterator2()).done;) {
            var item = _step2.value;
            item.last = Date.now();
          }
        };
        _proto.dispose = function dispose() {
          if (assetManager.downloader.handlers['.json'] === this.handler) assetManager.downloader.register('.json', this.original);
          assetManager.downloader.maxRetryCount = this.previousRetries;
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.pending), _step3; !(_step3 = _iterator3()).done;) {
            var item = _step3.value;
            if (!item.done) item.fail();
          }
          this.pending = [];
        };
        return JsonTransportGuard;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/main", ['./AdRewards.ts', './ArtDownloadGuard.ts', './ArtLayer.ts', './JsonTransportGuard.ts', './PicnicGame.ts', './PicnicTouchButton.ts', './PublicConfig.ts', './RewardedSession.ts', './Rules.ts', './Save.ts', './AudioBridge.ts', './GameAudioButton.ts', './GameAudioConfig.ts', './GameAudioManager.ts'], function () {
  return {
    setters: [null, null, null, null, null, null, null, null, null, null, null, null, null, null],
    execute: function () {}
  };
});

System.register("chunks:///_virtual/PicnicGame.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './ArtDownloadGuard.ts', './PicnicTouchButton.ts', './AudioBridge.ts', './ArtLayer.ts', './Rules.ts', './Save.ts', './AdRewards.ts', './PublicConfig.ts', './RewardedSession.ts', './JsonTransportGuard.ts'], function (exports) {
  var _inheritsLoose, _extends, _createForOfIteratorHelperLoose, cclegacy, _decorator, profiler, view, ResolutionPolicy, Node, Layers, UITransform, Canvas, Camera, Color, sys, game, Game, Graphics, Button, Label, BlockInputEvents, resources, JsonAsset, Component, ArtDownloadGuard, PicnicTouchButton, AudioBridge, ART, ArtLayer, Parade, SaveStore, resultReward, bonusPct, onRoundEnd, giftReward, giftAvailable, claimGift, adGateStart, adGateFinish, createAdGate, PUBLIC_CONFIG, RewardedSession, JsonTransportGuard;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _extends = module.extends;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      profiler = module.profiler;
      view = module.view;
      ResolutionPolicy = module.ResolutionPolicy;
      Node = module.Node;
      Layers = module.Layers;
      UITransform = module.UITransform;
      Canvas = module.Canvas;
      Camera = module.Camera;
      Color = module.Color;
      sys = module.sys;
      game = module.game;
      Game = module.Game;
      Graphics = module.Graphics;
      Button = module.Button;
      Label = module.Label;
      BlockInputEvents = module.BlockInputEvents;
      resources = module.resources;
      JsonAsset = module.JsonAsset;
      Component = module.Component;
    }, function (module) {
      ArtDownloadGuard = module.ArtDownloadGuard;
    }, function (module) {
      PicnicTouchButton = module.PicnicTouchButton;
    }, function (module) {
      AudioBridge = module.AudioBridge;
    }, function (module) {
      ART = module.ART;
      ArtLayer = module.ArtLayer;
    }, function (module) {
      Parade = module.Parade;
    }, function (module) {
      SaveStore = module.SaveStore;
    }, function (module) {
      resultReward = module.resultReward;
      bonusPct = module.bonusPct;
      onRoundEnd = module.onRoundEnd;
      giftReward = module.giftReward;
      giftAvailable = module.giftAvailable;
      claimGift = module.claimGift;
      adGateStart = module.adGateStart;
      adGateFinish = module.adGateFinish;
      createAdGate = module.createAdGate;
    }, function (module) {
      PUBLIC_CONFIG = module.PUBLIC_CONFIG;
    }, function (module) {
      RewardedSession = module.RewardedSession;
    }, function (module) {
      JsonTransportGuard = module.JsonTransportGuard;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "8e98bPjROBOd514WdZV3V4Z", "PicnicGame", undefined);
      var ccclass = _decorator.ccclass;
      var colors = ['#f3b2c3', '#ecc591', '#ef9a70', '#cab0e5'];
      var PicnicGame = exports('PicnicGame', (_dec = ccclass('PicnicGame'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(PicnicGame, _Component);
        function PicnicGame() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.coreReady = false;
          _this.loadingTick = null;
          _this.art = new ArtLayer();
          _this.titleArt = null;
          _this.artClock = 0;
          _this.stepClock = 0;
          _this.giftArt = null;
          _this.giftFrame = -1;
          _this.audioAlive = 4;
          _this.inputLog = [];
          _this.uiEpoch = 0;
          _this.gestures = new Map();
          _this.mission = null;
          _this.missionSeq = 0;
          _this.artTransport = new ArtDownloadGuard();
          _this.transport = new JsonTransportGuard();
          _this.rewarded = new RewardedSession();
          _this.adPanel = null;
          _this.adShield = null;
          _this.hiddenAdModals = [];
          _this.root = void 0;
          _this.ui = void 0;
          _this.field = void 0;
          _this.moving = void 0;
          _this.hud = void 0;
          _this.store = void 0;
          _this.levels = [];
          _this.plan = void 0;
          _this.table = void 0;
          _this.model = null;
          _this.page = 'loading';
          _this.modal = '';
          _this.generation = 0;
          _this.loadGen = 0;
          _this.progressAt = 0;
          _this.loadDeadline = 0;
          _this.ad = null;
          _this.adGate = createAdGate();
          _this.nativeAd = null;
          _this.adOwner = 0;
          _this.touch = null;
          _this.accumulator = 0;
          _this.uiClock = 0;
          _this.runId = 0;
          _this.selected = 1;
          _this.mapChapter = 0;
          _this.shopGroup = 'skin';
          _this.shopPage = 0;
          _this.settingsTab = 0;
          _this.labels = {};
          _this.controls = [];
          _this.tutorial = 0;
          _this.returnPage = 'home';
          _this.toastUntil = 0;
          _this.toastNode = void 0;
          _this.activeIntro = '';
          return _this;
        }
        var _proto = PicnicGame.prototype;
        _proto.traceTouch = function traceTouch(phase, e, button) {
          if (button === void 0) {
            button = '';
          }
          this.inputLog.push({
            phase: phase,
            id: e.getID(),
            epoch: this.uiEpoch,
            page: this.page,
            modal: this.modal,
            button: button
          });
          if (this.inputLog.length > 200) this.inputLog.shift();
        };
        _proto.onGestureStart = function onGestureStart(e) {
          this.traceTouch('capture-start', e);
          var id = e.getID();
          if (typeof id !== 'number' || !Number.isFinite(id)) return;
          this.gestures.set(id, {
            epoch: this.uiEpoch,
            consumed: false,
            ended: false
          });
        };
        _proto.onGestureEnd = function onGestureEnd(e) {
          var _this2 = this;
          this.traceTouch('capture-end', e);
          var id = e.getID();
          if (typeof id !== 'number' || !Number.isFinite(id)) return;
          var record = this.gestures.get(id);
          if (!record) return;
          record.ended = true;
          this.scheduleOnce(function () {
            if (_this2.gestures.get(id) === record) _this2.gestures["delete"](id);
          }, 0);
        };
        _proto.onLoad = function onLoad() {
          var _this3 = this;
          profiler.hideStats();
          this.transport.install();
          this.artTransport.onProgress = function () {
            if (_this3.page === 'loading') {
              _this3.progressAt = Date.now();
              _this3.loadDeadline = _this3.progressAt + 15000;
            }
          };
          this.artTransport.install();
          this.art.beforeRetry = function () {
            return _this3.artTransport.cancelPending();
          };
          view.setDesignResolutionSize(720, 1280, ResolutionPolicy.FIXED_WIDTH);
          this.root = new Node('Canvas');
          this.root.layer = Layers.Enum.UI_2D;
          this.node.addChild(this.root);
          this.root.addComponent(UITransform).setContentSize(720, 1280);
          this.root.addComponent(Canvas);
          this.root.on(Node.EventType.TOUCH_START, this.onGestureStart, this, true);
          this.root.on(Node.EventType.TOUCH_END, this.onGestureEnd, this, true);
          this.root.on(Node.EventType.TOUCH_CANCEL, this.onGestureEnd, this, true);
          var cam = new Node('Camera');
          this.node.addChild(cam);
          cam.setPosition(0, 0, 1000);
          var camera = cam.addComponent(Camera);
          camera.projection = Camera.ProjectionType.ORTHO;
          camera.orthoHeight = 640;
          camera.near = 0;
          camera.far = 2000;
          camera.visibility = Layers.Enum.UI_2D;
          camera.clearColor = new Color(210, 239, 211, 255);
          this.root.getComponent(Canvas).cameraComponent = camera;
          this.store = new SaveStore(sys.localStorage);
          AudioBridge.init();
          this.syncAudio();
          game.on(Game.EVENT_HIDE, this.onHide, this);
          game.on(Game.EVENT_SHOW, this.onShow, this);
          globalThis.__PICNIC__ = {
            art_transport: function art_transport() {
              return _this3.artTransport.snapshot();
            },
            art_status: function art_status() {
              return _this3.art.status();
            },
            input_trace: function input_trace() {
              return _this3.inputLog.slice();
            },
            state: function state() {
              return _this3.snapshot();
            },
            dump_ui: function dump_ui() {
              return {
                page: _this3.page,
                modal: _this3.modal,
                buttons: _this3.controls.filter(function (c) {
                  var _c$node;
                  return (_c$node = c.node) == null ? void 0 : _c$node.isValid;
                }).map(function (c) {
                  var p = c.node.getWorldPosition();
                  return _extends({}, c, {
                    node: undefined,
                    x: p.x + 360,
                    y: 640 - p.y
                  });
                }),
                model: _this3.snapshot()
              };
            }
          };
          this.load();
        };
        _proto.onDestroy = function onDestroy() {
          ++this.loadGen;
          this.coreReady = false;
          this.artTransport.dispose();
          this.transport.dispose();
          game.off(Game.EVENT_HIDE, this.onHide, this);
          game.off(Game.EVENT_SHOW, this.onShow, this);
          this.cancelAd();
          delete globalThis.__PICNIC__;
        };
        _proto.onHide = function onHide() {
          AudioBridge.pause('background');
          this.missionSeq++;
          if (this.mission) this.mission.busy = false;
          this.release();
          if (this.model) this.model.paused = true;
          if (this.page === 'game' && !this.modal) {
            this.modal = 'pause';
            this.render();
          }
        };
        _proto.onShow = function onShow() {
          AudioBridge.resume('background');
          this.transport.resume();
          this.artTransport.resume();
          this.store.recover();
          this.loadDeadline = this.page === 'loading' ? Date.now() + 15000 : 0;
          if (this.mission) this.queryMission();
        };
        _proto.snapshot = function snapshot() {
          var _this$model, _this$model2, _this$model3, _this$model4, _this$model5;
          return {
            page: this.page,
            modal: this.modal,
            level: this.selected,
            generation: this.generation,
            x: (_this$model = this.model) == null ? void 0 : _this$model.x,
            time: (_this$model2 = this.model) == null ? void 0 : _this$model2.time,
            held: (_this$model3 = this.model) == null ? void 0 : _this$model3.held,
            alive: (_this$model4 = this.model) == null ? void 0 : _this$model4.survivors,
            result: (_this$model5 = this.model) == null ? void 0 : _this$model5.result,
            save: this.store.data,
            ready: this.coreReady && this.page !== 'loading' && this.page !== 'loading-error' && this.levels.length === 70
          };
        };
        _proto.create = function create(name, parent, w, h, x, y) {
          if (parent === void 0) {
            parent = this.ui;
          }
          if (w === void 0) {
            w = 720;
          }
          if (h === void 0) {
            h = 1280;
          }
          if (x === void 0) {
            x = 0;
          }
          if (y === void 0) {
            y = 0;
          }
          var n = new Node(name);
          n.layer = Layers.Enum.UI_2D;
          parent.addChild(n);
          n.addComponent(UITransform).setContentSize(w, h);
          n.setPosition(x, y);
          return n;
        };
        _proto.box = function box(parent, x, y, w, h, color, r, name) {
          if (name === void 0) {
            name = 'Panel';
          }
          var n = this.create(name, parent, w, h, x, y);
          if (name === 'Modal Shield') {
            var shade = n.addComponent(Graphics);
            shade.fillColor = new Color(40, 35, 29, parent === this.root ? 90 : 150);
            shade.rect(-w / 2, -h / 2, w, h);
            shade.fill();
            return n;
          }
          var surface = this.art.sprite(n, name.startsWith('Popup ') ? 'art/ui/picnic_popup' : 'ui:panel', 0, 0, w, h, 'stretch', 'PanelSurface');
          if (name === 'Toast') surface.name = '__art_contrast_plate';
          if (name.startsWith('Popup ')) this.art.popup(n, w, h);
          return n;
        };
        _proto.dynamicText = function dynamicText(role, parent, str, x, y, size, color, w, h) {
          if (size === void 0) {
            size = 28;
          }
          if (color === void 0) {
            color = '#526b50';
          }
          if (w === void 0) {
            w = 650;
          }
          if (h === void 0) {
            h = 70;
          }
          var label = this.text(parent, str, x, y, size, color, w, h);
          label.node.name = 'runtime_' + role;
          return label;
        };
        _proto.text = function text(parent, str, x, y, size, color, w, h) {
          if (size === void 0) {
            size = 28;
          }
          if (w === void 0) {
            w = 650;
          }
          if (h === void 0) {
            h = 70;
          }
          return this.art.text(parent, str, x, y, size, w, h);
        };
        _proto.button = function button(parent, title, x, y, w, h, fn, fill, enabled, allowWhileAd) {
          if (enabled === void 0) {
            enabled = true;
          }
          if (allowWhileAd === void 0) {
            allowWhileAd = false;
          }
          var n = this.create('Button ' + title, parent, w, h, x, y);
          var metadata = n.addComponent(PicnicTouchButton);
          metadata.transition = Button.Transition.NONE;
          metadata.interactable = enabled;
          var icons = {
            Map: 'map',
            Skins: 'skins',
            Bakery: 'bakery',
            Gift: 'gift',
            Settings: 'settings',
            'Add Home': 'home',
            Revisit: 'revisit',
            Pause: 'pause'
          };
          var words = {
            Resume: 0,
            'Retry · free': 1,
            Retry: 1,
            Home: 2,
            Back: 2,
            Close: 3,
            'No thanks': 4,
            'No thanks · collect': 4,
            'Got it!': 5,
            Previous: 6,
            Next: 7,
            Bake: 8,
            General: 9,
            Sound: 10,
            Equip: 11
          };
          var states = {
            Heroes: 'stateA:0',
            Backgrounds: 'stateA:1',
            Equipped: 'stateA:2',
            'Clear Lv 70': 'stateA:3',
            'All 70 levels cleared': 'stateA:4',
            'Open TikTok entry': 'stateA:5',
            'Claim 30 Carrots': 'stateA:6',
            'Check visit': 'stateA:7',
            'Vibration: On': 'stateB:0',
            'Vibration: Off': 'stateB:1',
            'Music: On': 'stateB:2',
            'Music: Off': 'stateB:3',
            'Sound effects: On': 'stateB:4',
            'Sound effects: Off': 'stateB:5',
            Cancel: 'stateB:6',
            Back: 'stateC:0',
            'Checking…': 'stateC:1'
          };
          var price = /^\d+ Carrots$/.test(title);
          var variable = /^(Treat |Crown )?\d/.test(title) && !price;
          var special = {
            'No thanks · collect': 'stateD:1',
            'Watch ad · +3 hearts': 'stateD:2',
            'Watch ad · try this look': 'stateD:3'
          };
          var actualIcon = !!icons[title] && !(title === 'Settings' && this.modal) || title === 'Home' && h >= 85;
          var key = (title === 'Home' && h >= 85 ? 'ui:home' : title === 'Settings' && this.modal ? 'stateD:0' : special[title]) || states[title] || (price ? 'stateB:7' : variable ? this.page === 'map' ? 'ui:panel' : 'card:0' : icons[title] ? 'ui:' + icons[title] : title === 'PLAY' ? 'action:0' : title === 'Watch ad ×2' ? 'stateC:2' : title === 'Watch ad · revive 1 friend' ? 'stateC:3' : title.startsWith('Watch ad') ? 'action:1' : words[title] !== undefined ? 'button:' + words[title] : 'ui:level');
          var frameName = actualIcon ? 'icon_' + title.replace(/[^a-z0-9]+/gi, '_') : price ? 'btn_buy' : variable ? this.page === 'map' ? 'btn_level_node' : 'btn_volume_node' : 'btn_' + title.replace(/[^a-z0-9]+/gi, '_');
          this.art.sprite(n, key, 0, 0, w, h, key === 'ui:panel' ? 'stretch' : 'contain', frameName);
          if (variable) this.dynamicText('control_value', n, title, 0, 0, this.page === 'settings' ? 28 : h > 80 ? 29 : 23, '#49654d', w < 80 ? w - 6 : w - 32, h - 18);
          if (price) this.dynamicText('item_price', parent, title, x, y + (this.page === 'shop' ? 52 : 42), 24, '#49654d', this.page === 'shop' ? 270 : w - 20, 34);
          this.art.opacity(n, enabled);
          this.bindControl(n, title, w, h, fn, enabled, allowWhileAd);
          this.controls.push({
            node: n,
            name: title,
            page: this.page,
            modal: this.modal,
            x: x + 360,
            y: 640 - y,
            w: w,
            h: h,
            enabled: enabled
          });
          return n;
        };
        _proto.bindControl = function bindControl(n, title, w, h, fn, enabled, allowWhileAd) {
          var _this4 = this;
          if (enabled === void 0) {
            enabled = true;
          }
          if (allowWhileAd === void 0) {
            allowWhileAd = false;
          }
          var birth = this.uiEpoch;
          var owner = null;
          var armed = null;
          var pressedVisuals = new Map();
          var restoreVisuals = function restoreVisuals() {
            for (var _iterator = _createForOfIteratorHelperLoose(pressedVisuals), _step; !(_step = _iterator()).done;) {
              var _step$value = _step.value,
                child = _step$value[0],
                base = _step$value[1];
              if (child.isValid) child.setScale(base.x, base.y, base.z);
            }
            pressedVisuals.clear();
          };
          var pressVisuals = function pressVisuals() {
            restoreVisuals();
            for (var _iterator2 = _createForOfIteratorHelperLoose(n.children), _step2; !(_step2 = _iterator2()).done;) {
              var child = _step2.value;
              var base = child.getScale();
              pressedVisuals.set(child, {
                x: base.x,
                y: base.y,
                z: base.z
              });
              child.setScale(base.x * .96, base.y * .96, base.z);
            }
          };
          n.on(Node.EventType.TOUCH_START, function (e) {
            _this4.traceTouch('button-start', e, title);
            e.propagationStopped = true;
            var id = e.getID();
            if (typeof id !== 'number' || !Number.isFinite(id)) return;
            var record = _this4.gestures.get(id);
            if (enabled && owner === null && record && record.epoch === birth && !record.consumed && !record.ended) {
              owner = e.getID();
              armed = record;
              pressVisuals();
            }
          });
          n.on(Node.EventType.TOUCH_END, function (e) {
            restoreVisuals();
            e.propagationStopped = true;
            var record = _this4.gestures.get(e.getID());
            if (owner === null || typeof e.getID() !== 'number' || !Number.isFinite(e.getID()) || owner !== e.getID() || record !== armed) return;
            owner = null;
            armed = null;
            if (!enabled || !record || record.consumed || record.epoch !== birth || birth !== _this4.uiEpoch || _this4.ad && !allowWhileAd) return;
            record.consumed = true;
            _this4.traceTouch('button-owned-end', e, title);
            if (n.getComponent(UITransform).hitTest(e.getLocation())) {
              _this4.traceTouch('button-action', e, title);
              AudioBridge.click();
              fn();
            }
          });
          n.on(Node.EventType.TOUCH_CANCEL, function (e) {
            restoreVisuals();
            e.propagationStopped = true;
            if (owner === e.getID()) {
              if (armed) armed.consumed = true;
              owner = null;
              armed = null;
            }
          });
        };
        _proto.base = function base() {
          var _this$store;
          this.uiEpoch++;
          this.release();
          this.root.destroyAllChildren();
          this.controls = [];
          this.labels = {};
          this.titleArt = null;
          this.giftArt = null;
          this.giftFrame = -1;
          this.ui = this.create('Page ' + this.page, this.root);
          this.art.sprite(this.ui, this.page === 'settings' ? 'art/backgrounds/bg_settings' : ART.background(((_this$store = this.store) == null ? void 0 : _this$store.data.background) || 'bg_01'), 0, 0, 720, Math.max(1280, view.getVisibleSize().height), 'cover', this.page === 'settings' ? 'Settings Calm Background' : 'Woodland Full Background');
        };
        _proto.top = function top(back) {
          var _this5 = this;
          if (back === void 0) {
            back = true;
          }
          var d = this.store.data,
            extra = Math.max(0, (view.getVisibleSize().height - 1280) / 2);
          var currency = this.create('TopBarCurrency', this.ui, 290, 82, -185, 580 + extra);
          this.art.sprite(currency, 'resource:0', 0, 0, 290, 82, 'contain', 'carrot_capsule').name = '__art_contrast_plate';
          this.labels.coins = this.dynamicText('coin_total', currency, String(d.coins), 45, 0, 28, '#657b4e', 190, 50);
          this.labels.coins.node.name = 'Count';
          var energy = this.create('TopBarEnergy', this.ui, 190, 82, 60, 580 + extra);
          this.art.sprite(energy, 'resource:1', 0, 0, 190, 82, 'contain', 'lightning_capsule').name = '__art_contrast_plate';
          this.dynamicText('heart_total', energy, d.hearts + '/5', 20, 0, 27, '#657b4e', 100, 50).node.name = 'Count';
          var progress = this.create('TopBarProgress', this.ui, 200, 40, -220, 506 + extra);
          this.art.sprite(progress, 'ui:level', -80, 0, 28, 36, 'contain', 'level_flag');
          this.dynamicText('level_progress', progress, 'LV ' + Math.min(70, d.cleared + 1) + '/70', 20, 0, 22, '#637952', 160, 40).node.name = 'Count';
          if (back) this.button(this.ui, 'Home', -270, 430, 150, 75, function () {
            return _this5.home();
          }, '#c7dfbe');
        };
        _proto.officialText = function officialText(parent, str, x, y, size, w, h) {
          if (size === void 0) {
            size = 24;
          }
          if (w === void 0) {
            w = 600;
          }
          if (h === void 0) {
            h = 70;
          }
          var n = this.create('Cocos loading text', parent, w, h, x, y);
          var l = n.addComponent(Label);
          l.useSystemFont = true;
          l.fontSize = size;
          l.lineHeight = size * 1.3;
          l.string = str;
          l.color = new Color(220, 220, 220);
          l.horizontalAlign = Label.HorizontalAlign.CENTER;
          l.verticalAlign = Label.VerticalAlign.CENTER;
          l.overflow = Label.Overflow.SHRINK;
          return l;
        };
        _proto.loadingView = function loadingView(failed) {
          var _this6 = this;
          if (failed === void 0) {
            failed = false;
          }
          this.uiEpoch++;
          this.release();
          this.root.destroyAllChildren();
          this.controls = [];
          this.labels = {};
          this.titleArt = null;
          this.giftArt = null;
          this.loadingTick = null;
          this.ui = this.create('Cocos official loading', this.root);
          var backdrop = this.create('Cocos neutral background', this.ui, 720, Math.max(1280, view.getVisibleSize().height));
          var bg = backdrop.addComponent(Graphics);
          bg.fillColor = new Color(22, 22, 22);
          bg.rect(-360, -Math.max(1280, view.getVisibleSize().height) / 2, 720, Math.max(1280, view.getVisibleSize().height));
          bg.fill();
          this.art.sprite(this.ui, 'art/system/cocos_default', 0, 110, 140, 200, 'contain', 'Cocos official default logo');
          this.officialText(this.ui, failed ? 'Loading failed' : 'Loading...', 0, -60, 24);
          if (failed) {
            this.officialText(this.ui, 'Please try again.', 0, -110, 20);
            var retry = this.create('Cocos Retry', this.ui, 260, 64, 0, -190);
            var surface = retry.addComponent(Graphics);
            surface.fillColor = new Color(76, 76, 76);
            surface.roundRect(-130, -32, 260, 64, 8);
            surface.fill();
            this.officialText(retry, 'Retry', 0, 0, 25, 240, 60);
            var metadata = retry.addComponent(PicnicTouchButton);
            metadata.transition = Button.Transition.NONE;
            this.bindControl(retry, 'Retry', 260, 64, function () {
              return _this6.load();
            });
            this.controls.push({
              node: retry,
              name: 'Retry',
              page: this.page,
              modal: '',
              x: 360,
              y: 830,
              w: 260,
              h: 64,
              enabled: true
            });
          } else {
            var track = this.create('Cocos indeterminate track', this.ui, 280, 6, 0, -110);
            var g = track.addComponent(Graphics);
            g.fillColor = new Color(65, 65, 65);
            g.roundRect(-140, -3, 280, 6, 3);
            g.fill();
            this.loadingTick = this.create('Cocos indeterminate indicator', track, 60, 6);
            var indicator = this.loadingTick.addComponent(Graphics);
            indicator.fillColor = new Color(190, 190, 190);
            indicator.roundRect(-30, -3, 60, 6, 3);
            indicator.fill();
          }
        };
        _proto.load = function load() {
          var _this7 = this;
          var token = ++this.loadGen;
          this.artTransport.cancelPending();
          this.coreReady = false;
          this.page = 'loading';
          this.modal = '';
          this.loadingView();
          this.progressAt = Date.now();
          this.loadDeadline = this.progressAt + 15000;
          var remaining = 3;
          var loaded = {};
          var _loop = function _loop() {
            var name = _arr[_i];
            resources.load('config/' + name, JsonAsset, function (err, asset) {
              if (token !== _this7.loadGen) return;
              if (err) {
                _this7.loadFail(String(err));
                return;
              }
              loaded[name] = asset.json;
              _this7.progressAt = Date.now();
              _this7.loadDeadline = _this7.progressAt + 15000;
              if (--remaining === 0) {
                try {
                  if (loaded.levels.length !== 70) throw Error('Course data is incomplete');
                  _this7.levels = loaded.levels;
                  _this7.plan = loaded.level_plan;
                  _this7.table = loaded.unlock_table;
                  var paths = [ART.background(_this7.store.data.background), ART.hero(_this7.store.data.hero), ART.logo, 'art/ui/picnic_ui', 'art/ui/picnic_actions', 'art/ui/picnic_resources', 'art/text/fixed_extra', 'art/system/cocos_default'];
                  _this7.art.prewarm(paths, function () {
                    if (token !== _this7.loadGen) return;
                    _this7.progressAt = Date.now();
                    _this7.loadDeadline = _this7.progressAt + 15000;
                  }).then(function () {
                    if (token !== _this7.loadGen) return;
                    _this7.coreReady = true;
                    _this7.loadDeadline = 0;
                    _this7.home();
                  })["catch"](function (e) {
                    if (token === _this7.loadGen) _this7.loadFail(String(e));
                  });
                } catch (e) {
                  _this7.loadFail(String(e));
                }
              }
            });
          };
          for (var _i = 0, _arr = ['levels', 'level_plan', 'unlock_table']; _i < _arr.length; _i++) {
            _loop();
          }
        };
        _proto.loadFail = function loadFail(reason) {
          ++this.loadGen;
          this.coreReady = false;
          this.loadDeadline = 0;
          this.page = 'loading-error';
          this.loadingView(true);
          console.warn('Cocos loading failed', reason);
        };
        _proto.home = function home() {
          if (this.store.data.trial) this.store.commit(function (d) {
            return d.trial = '';
          });
          this.missionSeq++;
          this.mission = null;
          this.cancelAd();
          this.generation++;
          AudioBridge.resume('menu');
          AudioBridge.resume('ad');
          AudioBridge.scene('menu');
          this.model = null;
          this.page = 'home';
          this.modal = '';
          this.render();
        };
        _proto.syncAudio = function syncAudio() {
          var d = this.store.data,
            a = AudioBridge.manager;
          a.setMusic(d.music);
          a.setSFX(d.sfx);
          a.setMusicLevel(d.musicVolume);
          a.setSFXLevel(d.sfxVolume);
        };
        _proto.render = function render() {
          this.syncAudio();
          this.base();
          if (this.page === 'home') this.homeView();
          if (this.page === 'map') this.mapView();
          if (this.page === 'shop') this.shopView();
          if (this.page === 'bakery') this.bakeryView();
          if (this.page === 'settings') this.settingsView();
          if (this.page === 'game') this.gameView();
          if (this.modal) this.modalView();
        };
        _proto.homeView = function homeView() {
          var _this8 = this;
          this.top(false);
          this.button(this.ui, 'Settings', -290, 410, 130, 130, function () {
            _this8.returnPage = 'home';
            _this8.page = 'settings';
            _this8.render();
          }, '#d1e6c3');
          this.titleArt = this.art.sprite(this.ui, ART.logo, 0, 330, 580, 260, 'contain', 'txt_Pips_Picnic_Parade');
          this.moving = this.create('Home critters', this.ui, 400, 360, 0, -15);
          this.art.sprite(this.moving, ART.hero(this.store.data.trial || this.store.data.hero), 0, 0, 350, 350, 'contain', 'Home Pip');
          this.button(this.ui, 'Map', -270, 0, 148, 148, function () {
            _this8.page = 'map';
            _this8.mapChapter = Math.floor(Math.min(69, _this8.store.data.cleared) / 10);
            _this8.render();
          });
          this.button(this.ui, 'Skins', 270, 0, 148, 148, function () {
            _this8.page = 'shop';
            _this8.render();
          });
          this.button(this.ui, 'PLAY', 0, -260, 500, 145, function () {
            return _this8.offerStart(Math.min(70, _this8.store.data.cleared + 1));
          });
          this.button(this.ui, 'Bakery', -270, -447, 148, 148, function () {
            _this8.page = 'bakery';
            _this8.render();
          });
          var gift = this.button(this.ui, 'Gift', -90, -447, 148, 148, function () {
            _this8.modal = 'gift';
            _this8.render();
          });
          gift.children.forEach(function (n) {
            return n.active = false;
          });
          this.giftArt = this.create('Gift Ten Frame Animation', gift, 148, 148, 0, 10);
          for (var f = 0; f < 10; f++) {
            var frame = this.art.sprite(this.giftArt, 'art/gift/frame_' + String(f).padStart(2, '0'), 0, 0, 184, 156, 'contain', 'icon_Gift_Frame_' + f);
            frame.active = f === 0;
          }
          this.button(this.ui, 'Add Home', 90, -447, 148, 148, function () {
            return _this8.platform('addShortcut');
          });
          this.button(this.ui, 'Revisit', 270, -447, 148, 148, function () {
            return _this8.platform('startEntranceMission');
          });
          this.text(this.ui, 'Hold to march. Let go to wait.', 0, -566, 24);
          if (this.store.data.pending) {
            this.selected = this.store.data.pending.level;
            this.modal = 'pending';
          }
        };
        _proto.critter = function critter(parent, x, y, color, i) {
          var _this$model6;
          var ids = [this.store.data.trial || this.store.data.hero, 'hero_03', 'hero_04', 'hero_05'];
          var size = (_this$model6 = this.model) != null && _this$model6.c.path ? 72 : 110;
          return this.art.sprite(parent, ART.hero(ids[i % 4]), x, y, size, size, 'contain', 'Critter ' + i);
        };
        _proto.mapView = function mapView() {
          var _this9 = this;
          this.top();
          var chapter = this.mapChapter;
          this.text(this.ui, 'Picnic Trail', 0, 415, 38, '#526b50', 500, 110);
          this.dynamicText('chapter_progress', this.ui, chapter + 1 + ' / 7', 240, 415, 27, '#526b50', 150, 55);
          var names = ['Sunny Meadow', 'Berry Patch', 'Honeycomb Terrace', 'Orchard Trellis', 'Sweet Briar', 'Willow Brook', 'Grand Banquet'];
          this.text(this.ui, names[chapter], 0, 335, 27, '#526b50', 430, 65);
          var _loop2 = function _loop2() {
            var _e$reward;
            var id = chapter * 10 + i + 1;
            var e = _this9.plan.levels[id - 1];
            var stars = _this9.store.data.stars[id] || 0;
            var unlocked = id <= _this9.store.data.cleared + 1;
            var node = _this9.button(_this9.ui, (e.type === 'bonus' ? 'Treat ' : e.type === 'milestone' ? 'Crown ' : '') + id + (e.type === 'milestone' ? '\n' + (((_e$reward = e.reward) == null ? void 0 : _e$reward.type) === 'skin' ? 'Final Skin' : '+' + e.reward.amount + ' Coins') : '') + (stars ? '\n' + '★'.repeat(stars) : ''), -150 + i % 2 * 300, 220 - Math.floor(i / 2) * 145, 230, 105, function () {
              return _this9.offerStart(id);
            }, e.type === 'milestone' ? '#f2d99e' : e.type === 'bonus' ? '#edbeae' : '#d0dfb8', unlocked);
            if (e.type === 'milestone') {
              var _e$reward3;
              var value = node.children.find(function (child) {
                return child.name === 'runtime_control_value';
              });
              var label = value == null ? void 0 : value.getComponent(Label);
              if (label) {
                var _e$reward2;
                value.setPosition(50, 0);
                value.getComponent(UITransform).setContentSize(125, 90);
                label.fontSize = 24;
                label.lineHeight = 175;
                label.string = (id + '\n' + (((_e$reward2 = e.reward) == null ? void 0 : _e$reward2.type) === 'skin' ? 'Final\nSkin' : '+' + e.reward.amount + '\nCoins')).toUpperCase();
              }
              _this9.art.sprite(node, ((_e$reward3 = e.reward) == null ? void 0 : _e$reward3.type) === 'skin' ? ART.hero('hero_limited') : 'art/gift/frame_00', -65, 0, 100, 100, 'contain', 'Milestone Reward ' + id);
            }
          };
          for (var i = 0; i < 10; i++) {
            _loop2();
          }
          this.button(this.ui, 'Previous', -160, -555, 250, 70, function () {
            _this9.mapChapter = (chapter + 6) % 7;
            _this9.render();
          }, '#cadcbd');
          this.button(this.ui, 'Next', 160, -555, 250, 70, function () {
            _this9.mapChapter = (chapter + 1) % 7;
            _this9.render();
          }, '#cadcbd');
        };
        _proto.offerStart = function offerStart(id) {
          var _this10 = this;
          if (id > this.store.data.cleared + 1) return;
          if (this.page === 'game' && this.model && this.model.result !== 'playing') {
            this.model = null;
            this.page = 'home';
          }
          this.selected = id;
          if (this.store.data.pending) {
            this.modal = 'pending';
            this.render();
            return;
          }
          if (id >= 3 && id % 3 === 0 && !this.store.data.trial) {
            var item = this.table.items.find(function (it) {
              return it.group === 'skin' && it.rarity === 'epic' && !_this10.store.data.owned.includes(it.id);
            });
            if (item) {
              this.activeIntro = item.id;
              this.modal = 'trial';
              this.render();
              return;
            }
          }
          this.startLevel(id);
        };
        _proto.startLevel = function startLevel(id, retry) {
          if (retry === void 0) {
            retry = false;
          }
          this.store.recover();
          if (!retry && this.store.data.hearts < 1) {
            this.modal = 'energy';
            this.render();
            return;
          }
          var sugar = this.store.data.sugar,
            freeze = this.store.data.freeze;
          if (!this.store.commit(function (d) {
            if (!retry) {
              if (d.hearts === 5) d.regen = Date.now();
              d.hearts--;
            }
            d.nextRun++;
            d.sugar = 0;
            if (d.freeze > 0) d.freeze--;
          })) return this.toast(this.store.error);
          this.generation++;
          this.selected = id;
          this.runId = this.store.data.nextRun;
          this.accumulator = 0;
          this.model = new Parade(this.levels[id - 1], sugar, freeze > 0 ? 2 : 0);
          AudioBridge.resume('menu');
          AudioBridge.scene('game', id);
          this.audioAlive = 4;
          this.page = 'game';
          this.modal = '';
          this.tutorial = id <= 2 ? 1 : 0;
          var hints = {
            6: 'Step on a plate to open its gate. Keep marching!',
            8: 'Honey slows your parade. Time each crossing!',
            22: 'Save 3 or 4 friends for three stars.',
            32: 'Bake delivered pastries into tarts.'
          };
          if (hints[id] && !this.store.data.intro.includes(id)) {
            this.activeIntro = hints[id];
            this.modal = 'intro';
            this.model.paused = true;
          }
          this.render();
        };
        _proto.path = function path(distance, lane) {
          if (lane === void 0) {
            lane = 0;
          }
          var points = this.model.c.path;
          if ((points == null ? void 0 : points.length) >= 2) {
            var left = Math.max(0, Math.min(this.model.c.length, distance));
            for (var i = 1; i < points.length; i++) {
              var a = points[i - 1],
                b = points[i],
                length = Math.hypot(b[0] - a[0], b[1] - a[1]);
              if (left <= length || i === points.length - 1) {
                var t = Math.min(1, left / length);
                return {
                  x: a[0] + (b[0] - a[0]) * t,
                  y: a[1] + (b[1] - a[1]) * t + lane * 15,
                  angle: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI
                };
              }
              left -= length;
            }
          }
          var s = Math.max(0, Math.min(1, distance / this.model.c.length)) * 2585;
          for (var row = 0; row < 4; row++) {
            if (s <= 470 || row === 3) return {
              x: row % 2 === 0 ? -235 + Math.min(470, s) : 235 - Math.min(470, s),
              y: 380 - row * 235 + lane * 15 - 22,
              angle: row % 2 === 0 ? 0 : 180
            };
            s -= 470;
            if (s <= 235) return {
              x: row % 2 === 0 ? 235 : -235,
              y: 380 - row * 235 - s + lane * 15 - 22,
              angle: -90
            };
            s -= 235;
          }
          return {
            x: -235,
            y: -347,
            angle: 180
          };
        };
        _proto.gameView = function gameView() {
          var _this11 = this;
          this.field = this.create('Gameplay Field', this.ui, 720, 1040, 0, 0);
          var field = this.field;
          var c = this.model.c;
          this.art.sprite(field, 'art/backgrounds/game_table', 0, 0, 640, 1000, 'contain', 'Gameplay Table');
          if (c.path) {
            for (var d = 0; d <= c.length; d += 30) {
              var p = this.path(d);
              this.art.sprite(field, 'prop:0', p.x, p.y, 76, 62, 'contain', 'Trail Segment ' + d).angle = p.angle;
            }
            for (var i = 1; i < c.path.length - 1; i++) this.art.sprite(field, 'prop:0', c.path[i][0], c.path[i][1], 76, 72, 'contain', 'Trail Corner ' + i);
          } else {
            for (var row = 0; row < 4; row++) {
              for (var j = 0; j < 5; j++) this.art.sprite(field, 'prop:0', -216 + j * 108, 358 - row * 235, 134, 110, 'stretch', 'Trail ' + row + ' ' + j);
            }
            for (var _i2 = 0; _i2 < 3; _i2++) this.art.sprite(field, 'prop:1', _i2 % 2 === 0 ? 235 : -235, 240 - _i2 * 235, 100, 235, 'stretch', 'Trail Turn ' + _i2);
          }
          for (var _iterator3 = _createForOfIteratorHelperLoose(c.zones), _step3; !(_step3 = _iterator3()).done;) {
            var z = _step3.value;
            for (var _d = z.start; _d < z.end; _d += 28) {
              var _p = this.path(_d);
              this.art.sprite(field, 'prop:3', _p.x, _p.y, c.path ? 52 : 63, c.path ? 60 : 75, 'contain', 'Honey');
            }
          }
          this.moving = this.create('Live Course', field);
          var end = this.path(c.length);
          this.art.sprite(field, 'prop:7', end.x, end.y, 116, 110, 'contain', 'Picnic Basket');
          this.hud = this.create('HUD', this.ui);
          this.labels.status = this.dynamicText('course_status', this.hud, '', -20, 590, 25, '#637952', 530, 55);
          this.button(this.hud, 'Pause', -295, 530, 92, 92, function () {
            return _this11.pause();
          });
          this.art.sprite(this.hud, 'counter:well', 0, -574, 690, 80, 'stretch', 'course_hint_well').name = '__art_contrast_plate';
          this.labels.hint = this.dynamicText('course_hint', this.hud, 'Hold to march - Release to wait', 0, -574, 25, '#65794b', 690, 60);
          var zone = this.create('March Touch Zone', field, 720, 1030, 0, -15);
          zone.on(Node.EventType.TOUCH_START, function (e) {
            if (_this11.touch === null && !_this11.modal && _this11.model.result === 'playing') {
              _this11.touch = e.getID();
              AudioBridge.gesture();
              AudioBridge.step();
              _this11.model.setHeld(true);
              if (_this11.tutorial === 1) _this11.tutorial = 2;
            }
          });
          zone.on(Node.EventType.TOUCH_END, function (e) {
            if (_this11.touch === e.getID()) {
              _this11.release();
              if (_this11.tutorial === 2) _this11.tutorial = 3;
            }
          });
          zone.on(Node.EventType.TOUCH_CANCEL, function (e) {
            if (_this11.touch === e.getID()) _this11.release();
          });
          this.drawCourse();
        };
        _proto.drawCourse = function drawCourse() {
          var _this12 = this;
          if (!this.moving || !this.model) return;
          this.moving.destroyAllChildren();
          var m = this.model,
            c = m.c;
          var _loop4 = function _loop4() {
            var h = _step4.value;
            var p = _this12.path(h.pos);
            var active = [0, 1, 2, 3].some(function (i) {
              return m.alive[i] && m.hazardActive(h, i);
            });
            var k = h.kind === 'bramble' ? active ? 8 : 9 : active ? 10 : 11;
            _this12.art.sprite(_this12.moving, 'prop:' + k, p.x, p.y, c.path ? 68 : 100, c.path ? 75 : 110, 'contain', 'Hazard ' + h.kind + (active ? ' Stop' : ' Go'));
          };
          for (var _iterator4 = _createForOfIteratorHelperLoose(c.hazards), _step4; !(_step4 = _iterator4()).done;) {
            _loop4();
          }
          c.gates.forEach(function (gate, i) {
            var p = _this12.path(gate.pos),
              plate = _this12.path(gate.plate);
            var open = m.gateTimes[i] >= 0 && m.time - m.gateTimes[i] >= (gate.delay || .35);
            _this12.art.sprite(_this12.moving, 'prop:6', plate.x, plate.y, c.path ? 46 : 63, c.path ? 50 : 67, 'contain', 'Pressure Plate');
            _this12.art.sprite(_this12.moving, 'prop:' + (open ? 5 : 4), p.x, p.y, c.path ? 82 : 105, c.path ? 78 : 100, 'contain', 'Gate ' + (open ? 'Open' : 'Closed'));
          });
          if (m.held && c.id >= 2) {
            var _loop3 = function _loop3() {
              var dist = m.x + j * 4;
              if (dist >= c.length) return 1; // break
              var p = _this12.path(dist);
              var hazard = c.hazards.find(function (h) {
                return Math.abs(h.pos - dist) < 18;
              });
              var safe = !hazard || m.safeAt(hazard, m.travelTime(dist));
              _this12.art.sprite(_this12.moving, 'prop:' + (safe ? 9 : 8), p.x, p.y, 12, 12, 'contain', 'Timing Advice ' + (safe ? 'Safe' : 'Wait'));
            };
            for (var j = 1; j <= 30; j++) {
              if (_loop3()) break;
            }
          }
          var index = Math.max(0, this.table.items.findIndex(function (it) {
            return it.id === (_this12.store.data.trial || _this12.store.data.hero);
          }));
          var p = this.path(m.x);
          for (var i = 0; i < 4; i++) if (m.alive[i]) {
            var gap = c.path ? 36 : 70;
            var _char = this.critter(this.moving, p.x + i % 2 * gap - gap / 2, p.y + Math.floor(i / 2) * gap - gap / 2, colors[(i + index) % 4], i);
            _char.setScale(.85, .85, 1);
            if (m.shield > 0 || m.sugar > 0) this.art.sprite(_char, 'ui:level', 0, 0, 100, 100, 'contain', 'Sugar Shield');
          }
          this.labels.status.string = 'Lv ' + c.id + '   Friends ' + m.survivors + '/4   ' + Math.floor(m.x / c.length * 100) + '%';
          this.labels.hint.string = (this.tutorial === 1 ? 'Hold the path to march.' : this.tutorial === 2 ? 'Let go now to stop your friends.' : this.tutorial === 3 ? 'Wait for green, then hold to reach the basket.' : m.held ? 'Marching! Let go to wait.' : 'Stopped · Hold the path to march') + '\nSave all 4 for a perfect picnic.';
        };
        _proto.release = function release() {
          this.touch = null;
          if (this.model) {
            if (this.model.held) AudioBridge.halt();
            this.model.setHeld(false);
          }
        };
        _proto.pause = function pause() {
          AudioBridge.pause('menu');
          this.release();
          this.model.paused = true;
          this.modal = 'pause';
          this.render();
        };
        _proto.finish = function finish() {
          var _this13 = this;
          this.release();
          this.model.paused = true;
          var m = this.model;
          if (m.result === 'won') {
            var d = this.store.data;
            var reward = resultReward(this.plan.levels[this.selected - 1].coins, bonusPct(this.table, [d.trial || d.hero, d.background]));
            var id = 'run-' + this.runId;
            if (!this.store.commit(function (s) {
              s.pending = {
                id: id,
                level: _this13.selected,
                stars: m.stars,
                survivors: m.survivors,
                coins: reward.total,
                pastries: _this13.selected >= 32 ? m.survivors * 3 : 0,
                base: reward.base,
                bonus: reward.skin_bonus
              };
              s.gift = onRoundEnd(s.gift);
              s.trial = '';
            })) return this.toast(this.store.error);
            AudioBridge.basket(m.survivors);
            AudioBridge.win();
            var _loop5 = function _loop5(i) {
              _this13.scheduleOnce(function () {
                return AudioBridge.star(i + 1);
              }, i * .18);
            };
            for (var i = 0; i < m.stars; i++) {
              _loop5(i);
            }
            this.modal = 'won';
          } else {
            this.store.commit(function (d) {
              d.gift = onRoundEnd(d.gift);
              d.trial = '';
            });
            AudioBridge.lose();
            this.modal = 'lost';
          }
          this.render();
        };
        _proto.milestoneCoins = function milestoneCoins(p) {
          var _this$plan;
          if (p === void 0) {
            p = this.store.data.pending;
          }
          var r = p && ((_this$plan = this.plan) == null || (_this$plan = _this$plan.levels[p.level - 1]) == null ? void 0 : _this$plan.reward);
          return (r == null ? void 0 : r.type) === 'coins' && !(Array.isArray(this.store.data.milestonesPaid) && this.store.data.milestonesPaid.includes(p.level)) && !this.store.data.receipts.includes('milestone-' + p.level) && Number.isFinite(r.amount) ? Math.max(0, Math.floor(r.amount)) : 0;
        };
        _proto.claim = function claim(mult) {
          if (mult === void 0) {
            mult = 1;
          }
          var p = this.store.data.pending;
          if (!p) return true;
          if (this.store.data.receipts.includes(p.id)) {
            var cleared = this.store.commit(function (d) {
              d.pending = null;
            });
            if (!cleared) this.toast(this.store.error);
            return cleared;
          }
          var milestone = this.milestoneCoins(p);
          var ok = this.store.reward(p.id, function (d) {
            d.coins += (p.coins + milestone) * mult;
            if (milestone) {
              d.receipts.push('milestone-' + p.level);
              d.milestonesPaid = [].concat(Array.isArray(d.milestonesPaid) ? d.milestonesPaid : [], [p.level]);
            }
            d.pastries = Math.min(9999, d.pastries + p.pastries * mult);
            d.cleared = Math.max(d.cleared, p.level);
            d.stars[p.level] = Math.max(d.stars[p.level] || 0, p.stars);
            if (p.level >= 15 && p.survivors === 4) d.freeze++;
            if (p.level === 70 && !d.owned.includes('hero_limited')) d.owned.push('hero_limited');
            d.pending = null;
          });
          if (ok) AudioBridge.coins(p.coins * mult);
          if (!ok) this.toast(this.store.error || 'This reward has already been collected.');
          return ok;
        };
        _proto.modalView = function modalView() {
          var _this14 = this;
          var shade = this.box(this.ui, 0, 0, 720, Math.max(1280, view.getVisibleSize().height), '#bdd3b7', 0, 'Modal Shield');
          shade.addComponent(BlockInputEvents);
          shade.on(Node.EventType.TOUCH_START, function (e) {
            return e.propagationStopped = true;
          });
          shade.on(Node.EventType.TOUCH_END, function (e) {
            return e.propagationStopped = true;
          });
          var panel = this.box(shade, 0, -10, 600, 860, '#f8e9c5', 38, 'Popup ' + this.modal);
          this.text(panel, this.modalTitle(), 0, 316, 34, '#526b50', 490, 54);
          var pictures = {
            pause: 'ui:pause',
            won: 'prop:7',
            pending: 'prop:7',
            collected: 'prop:12',
            lost: 'art/heroes/hero_01',
            intro: 'prop:4',
            gift: 'ui:gift',
            energy: 'energy:bolt',
            trial: ART.hero(this.activeIntro),
            mission: 'ui:home'
          };
          this.art.sprite(panel, pictures[this.modal] || 'ui:gift', 0, this.modal === 'intro' ? 152 : 155, this.modal === 'intro' ? 300 : 280, this.modal === 'intro' ? 265 : 235, 'contain', 'Popup Illustration ' + this.modal);
          var b = function b(title, y, fn, color, enabled) {
            if (color === void 0) {
              color = '#e8b49a';
            }
            if (enabled === void 0) {
              enabled = true;
            }
            return _this14.button(panel, title, 0, y, title === 'Home' ? 100 : 490, 85, fn, color, enabled);
          };
          if (this.modal === 'pause') {
            b('Resume', -10, function () {
              AudioBridge.resume('menu');
              _this14.modal = '';
              _this14.model.paused = false;
              _this14.render();
            });
            b('Retry · free', -105, function () {
              return _this14.startLevel(_this14.selected, true);
            });
            b('Home', -200, function () {
              return _this14.home();
            });
            b('Settings', -295, function () {
              _this14.modal = '';
              _this14.returnPage = 'game';
              _this14.page = 'settings';
              _this14.render();
            });
          }
          if (this.modal === 'won' || this.modal === 'pending') {
            var p = this.store.data.pending;
            this.dynamicText('result_stars', panel, '★'.repeat((p == null ? void 0 : p.stars) || 1), 0, 10, 42, '#d8a35d', 430, 30);
            this.dynamicText('result_reward', panel, '+' + (((p == null ? void 0 : p.coins) || 0) + this.milestoneCoins(p)) + ' Carrot Coins\n+' + ((p == null ? void 0 : p.pastries) || 0) + ' Pastries' + (p != null && p.bonus ? '\nSkin bonus +' + p.bonus : ''), 0, -45, 27, '#71804f', 430, 80);
            b('Watch ad ×2', -127, function () {
              return _this14.watchAd(function () {
                if (_this14.claim(2)) {
                  _this14.modal = 'collected';
                  _this14.render();
                }
              }, function () {
                if (_this14.claim()) {
                  _this14.modal = 'collected';
                  _this14.render();
                }
              });
            });
            b('No thanks · collect', -217, function () {
              if (_this14.claim()) {
                _this14.modal = 'collected';
                _this14.render();
              }
            }, '#c8dcaf');
            b('Home', -307, function () {
              if (_this14.claim()) _this14.home();
            }, '#d5dfb7');
          }
          if (this.modal === 'collected') {
            this.text(panel, 'Your treats are safely packed!', 0, -30, 30, '#526b50', 430, 110);
            b(this.selected < 70 ? 'Next' : 'All 70 levels cleared', -127, function () {
              if (_this14.selected < 70) _this14.offerStart(_this14.selected + 1);else _this14.home();
            });
            b('Home', -217, function () {
              return _this14.home();
            });
            b('Retry · free', -307, function () {
              return _this14.startLevel(_this14.selected, true);
            });
          }
          if (this.modal === 'lost') {
            this.text(panel, 'The picnic can wait. Release to stop before each crossing.', 0, -30, 28, '#526b50', 430, 110);
            b('Retry · free', -127, function () {
              return _this14.startLevel(_this14.selected, true);
            });
            b('Home', -217, function () {
              return _this14.home();
            }, '#cbdcb8');
            b('Watch ad · revive 1 friend', -307, function () {
              return _this14.watchAd(function () {
                if (_this14.model.revive()) {
                  AudioBridge.revive();
                  _this14.model.paused = false;
                  _this14.modal = '';
                  _this14.render();
                }
              });
            }, '#e4c4d4', !this.model.revived);
          }
          if (this.modal === 'intro') {
            this.dynamicText('mechanic_intro', panel, this.activeIntro, 0, -40, 31, '#687c4e', 430, 110);
            b('Got it!', -250, function () {
              _this14.store.commit(function (d) {
                return d.intro.push(_this14.selected);
              });
              _this14.model.paused = false;
              _this14.modal = '';
              _this14.render();
            });
          }
          if (this.modal === 'gift') {
            var d = this.store.data;
            var reward = giftReward(30, this.table, d.owned, d.cleared);
            this.dynamicText('gift_state_reward', panel, giftAvailable(d.gift) ? 'A picnic surprise!\n+' + reward + ' Carrot Coins' : 'Play a level to refill your gift.', 0, -30, 32, '#6d8051', 430, 110);
            b('Watch ad · ' + reward + ' Carrots', -160, function () {
              return _this14.watchAd(function () {
                var r = claimGift(_this14.store.data.gift, 30, _this14.table, _this14.store.data.owned, _this14.store.data.cleared);
                if (r.coins && _this14.store.commit(function (s) {
                  s.coins += r.coins;
                  s.gift = r.state;
                })) {
                  _this14.modal = '';
                  _this14.render();
                }
              });
            }, '#e7b4c3', giftAvailable(d.gift));
            b('Close', -300, function () {
              _this14.modal = '';
              _this14.render();
            }, '#cadcb7');
          }
          if (this.modal === 'energy') {
            var _d2 = this.store.data;
            this.dynamicText('energy_state', panel, 'Hearts ' + _d2.hearts + '/5\nA heart returns every 20 minutes.', 0, -30, 30, '#71804f', 430, 110);
            b('Watch ad · +3 hearts', -160, function () {
              return _this14.watchAd(function () {
                if (_this14.store.commit(function (s) {
                  return s.hearts += 3;
                })) {
                  _this14.modal = '';
                  _this14.render();
                }
              });
            }, '#e7bdc3', _d2.hearts <= 2);
            b('Close', -300, function () {
              _this14.modal = '';
              _this14.render();
            }, '#c9dcb8');
          }
          if (this.modal === 'mission') {
            var m = this.mission,
              claimed = this.store.data.receipts.includes('mission-' + m.kind);
            this.dynamicText('mission_status', panel, (m.kind === 'shortcut' ? 'Add to Home Screen' : 'Revisit from Profile') + '\n' + (claimed ? 'Reward collected. Enjoy your next picnic!' : m.status), 0, -30, 27, '#6c8050', 430, 110);
            b('Open TikTok entry', -127, function () {
              return _this14.navigateMission();
            });
            b(m.eligible ? 'Claim 30 Carrots' : m.busy ? 'Checking…' : 'Check visit', -217, function () {
              if (m.eligible) {
                if (_this14.store.reward('mission-' + m.kind, function (d) {
                  return d.coins += 30;
                })) {
                  m.eligible = false;
                  _this14.render();
                } else _this14.toast(_this14.store.error);
              } else _this14.queryMission();
            }, '#d7c3df', !claimed && !m.busy);
            b('Close', -307, function () {
              _this14.missionSeq++;
              _this14.mission = null;
              _this14.modal = '';
              _this14.render();
            }, '#c9dcb7');
          }
          if (this.modal === 'trial') {
            var item = this.table.items.find(function (it) {
              return it.id === _this14.activeIntro;
            });
            this.dynamicText('trial_offer', panel, 'Try ' + item.name + '\n+' + item.bonus.pct + '% coins this level!', 0, -30, 31, '#71804f', 430, 110);
            b('Watch ad · try this look', -160, function () {
              return _this14.watchAd(function () {
                if (_this14.store.commit(function (d) {
                  return d.trial = item.id;
                })) _this14.startLevel(_this14.selected);
              }, function () {
                return _this14.startLevel(_this14.selected);
              });
            });
            b('No thanks', -300, function () {
              return _this14.startLevel(_this14.selected);
            }, '#cadcb7');
          }
        };
        _proto.modalTitle = function modalTitle() {
          return {
            pause: 'Picnic paused',
            won: 'Picnic delivered!',
            pending: 'Your picnic reward',
            collected: 'Lovely work!',
            lost: 'Oops! A little tumble',
            intro: 'A new picnic trick',
            gift: 'Picnic Gift',
            energy: 'Rest and recharge',
            trial: 'A new look for one picnic',
            mission: 'Picnic visits'
          }[this.modal] || 'Picnic';
        };
        _proto.shopView = function shopView() {
          var _this15 = this;
          this.top();
          this.text(this.ui, 'Picnic Wardrobe', 0, 425, 42, '#526b50', 500, 112);
          this.button(this.ui, 'Heroes', -160, 315, 260, 75, function () {
            _this15.shopGroup = 'skin';
            _this15.shopPage = 0;
            _this15.render();
          }, '#e4c6d8');
          this.button(this.ui, 'Backgrounds', 160, 315, 260, 75, function () {
            _this15.shopGroup = 'background';
            _this15.shopPage = 0;
            _this15.render();
          }, '#c6d9b8');
          var list = this.table.items.filter(function (it) {
            return it.group === _this15.shopGroup;
          });
          var count = Math.ceil(list.length / 4);
          this.shopPage = (this.shopPage + count) % count;
          var remaining = list.slice(this.shopPage * 4, this.shopPage * 4 + 4);
          remaining.forEach(function (it, i) {
            var _it$bonus;
            var centeredPair = _this15.shopGroup === 'background' && remaining.length === 2;
            var x = centeredPair ? 0 : -175 + i % 2 * 350,
              y = centeredPair ? 90 - i * 370 : 90 - Math.floor(i / 2) * 370;
            var frameIndex = it.limited ? 3 : it.rarity === 'epic' ? 2 : it.rarity === 'rare' ? 1 : 0;
            var source = [{
              w: 580,
              h: 584,
              cy: 18
            }, {
              w: 581,
              h: 584,
              cy: 18
            }, {
              w: 580,
              h: 583,
              cy: 6
            }, {
              w: 580,
              h: 583,
              cy: 6
            }][frameIndex];
            var scale = 340 / source.w;
            var innerY = source.h * scale / 2 - (312.5 - source.cy) * scale;
            var card = _this15.create('Collection Card ' + it.id, _this15.ui, 340, 345, x, y);
            _this15.art.sprite(card, 'card:' + frameIndex, 0, 0, 340, 345, 'contain', 'Collection Frame ' + it.rarity);
            _this15.art.sprite(card, it.group === 'skin' ? ART.hero(it.id) : ART.background(it.id), 0, innerY + 85, 94, 94, 'contain', 'Portrait ' + it.id);
            var owned = _this15.store.data.owned.includes(it.id);
            var equipped = (_this15.shopGroup === 'skin' ? _this15.store.data.hero : _this15.store.data.background) === it.id;
            _this15.text(card, it.name, 0, innerY + 18, 22, '#69764e', 260, 32);
            _this15.dynamicText('item_bonus', card, '+' + (((_it$bonus = it.bonus) == null ? void 0 : _it$bonus.pct) || 0) + '% coins', 0, innerY - 17, 22, '#69764e', 250, 30);
            _this15.button(card, equipped ? 'Equipped' : owned ? 'Equip' : it.unlock === 'level' ? 'Clear Lv 70' : it.coins + ' Carrots', 0, innerY - 103, 255, 66, function () {
              if (it.unlock === 'level' && !owned) return _this15.toast('Clear level 70 to earn this look.');
              if (!owned && _this15.store.data.coins < it.coins) return _this15.toast('More Carrot Coins needed.');
              if (_this15.store.commit(function (d) {
                if (!owned) {
                  d.coins -= it.coins;
                  d.owned.push(it.id);
                }
                d[_this15.shopGroup === 'skin' ? 'hero' : 'background'] = it.id;
              })) _this15.render();else _this15.toast(_this15.store.error);
            }, '#c5d7ac', !equipped);
          });
          this.button(this.ui, 'Previous', -170, -555, 260, 75, function () {
            _this15.shopPage--;
            _this15.render();
          });
          this.button(this.ui, 'Next', 170, -555, 260, 75, function () {
            _this15.shopPage++;
            _this15.render();
          });
          var pageCounter = this.create('Wardrobe Page Counter', this.ui, 240, 44, 0, -613);
          this.art.sprite(pageCounter, 'counter:well', 0, 0, 240, 44, 'contain', 'page_value_well').name = '__art_contrast_plate';
          this.dynamicText('wardrobe_page', pageCounter, this.shopPage + 1 + ' / ' + count, 0, 0, 24, '#526b50', 100, 32);
        };
        _proto.bakeryView = function bakeryView() {
          var _this16 = this;
          this.top();
          this.text(this.ui, 'Berry Tart Bakery', 0, 425, 43, '#526b50', 500, 112);
          this.dynamicText('bakery_inventory', this.ui, 'Pastries ' + this.store.data.pastries + '\nDeliver pastries from level 32 onward.', 0, 300, 27, '#6e7f51', 650, 100);
          var recipes = [['Strawberry Tart', 10, 50], ['Blueberry Scone', 20, 90], ['Blackberry Custard', 25, 120], ['Royal Gateau', 45, 250]];
          recipes.forEach(function (r, i) {
            var y = 140 - i * 190;
            _this16.art.sprite(_this16.ui, 'recipe:' + i, 0, y, 620, 188, 'contain', 'txt_recipe_' + r[0].replace(/ /g, '_'));
            _this16.button(_this16.ui, 'Bake', 238, y, 125, 85, function () {
              if (_this16.store.data.pastries < r[1]) return _this16.toast('Deliver more pastries first.');
              if (_this16.store.commit(function (d) {
                d.pastries -= r[1];
                d.coins += r[2];
                if (i === 0 && d.cleared >= 25) d.sugar++;
              })) {
                _this16.render();
                _this16.toast(i === 0 ? 'Baked! A sugar shield is ready for your next picnic.' : 'Freshly baked!');
              } else _this16.toast(_this16.store.error);
            }, '#c5d8ac', _this16.store.data.cleared >= 31);
          });
        };
        _proto.settingsView = function settingsView() {
          var _this17 = this;
          this.top(false);
          this.button(this.ui, 'Back', -280, 430, 130, 62, function () {
            _this17.page = _this17.returnPage;
            if (_this17.page === 'game') {
              _this17.modal = 'pause';
            }
            _this17.render();
          }, '#c7dfbe');
          this.text(this.ui, 'Picnic Settings', 0, 425, 42, '#526b50', 500, 112);
          this.button(this.ui, 'General', -160, 315, 270, 75, function () {
            _this17.settingsTab = 0;
            _this17.render();
          });
          this.button(this.ui, 'Sound', 160, 315, 270, 75, function () {
            _this17.settingsTab = 1;
            _this17.render();
          }, '#c8dcb5');
          if (!this.settingsTab) {
            var guide = this.create('Settings Guide', this.ui, 600, 400, 0, 100);
            this.art.sprite(guide, 'art/ui/picnic_popup', 0, 0, 600, 400, 'stretch', 'Settings Guide Surface').name = '__art_contrast_plate';
            this.text(guide, 'HOW TO PLAY\nHold to march.\nRelease to wait.\nCross on green.\nSave a friend to win.\n3-4 friends: 3 stars\n2: 2 stars. 1: 1 star.', 0, 0, 22, '#6a7c4f', 430, 230);
            this.button(this.ui, 'Vibration: ' + (this.store.data.vibration ? 'On' : 'Off'), 0, -170, 500, 85, function () {
              if (_this17.store.commit(function (d) {
                return d.vibration = !d.vibration;
              })) _this17.render();
            });
            this.art.sprite(this.ui, 'art/text/about', 0, -280, 300, 65, 'contain', 'txt_about');
            this.text(this.ui, "MUSIC: SAPPHIRE ISLE / HEARTWARMING\nKEVIN MACLEOD - INCOMPETECH.COM\nCC BY 4.0 - CREATIVECOMMONS.ORG/LICENSES/BY/4.0/\nEDITED: LOOP, TRIM, LOUDNESS AND MP3.", 0, -405, 20, '#718256', 650, 190);
          } else {
            ['music', 'sfx'].forEach(function (key, i) {
              var y = 150 - i * 330;
              _this17.button(_this17.ui, (key === 'music' ? 'Music' : 'Sound effects') + ': ' + (_this17.store.data[key] ? 'On' : 'Off'), 0, y, 500, 80, function () {
                if (_this17.store.commit(function (d) {
                  return d[key] = !d[key];
                })) _this17.render();
              });
              _this17.dynamicText('volume_' + key, _this17.ui, 'Volume ' + _this17.store.data[key + 'Volume'] * 10 + '%', 0, y - 95, 28);
              var _loop6 = function _loop6(j) {
                _this17.button(_this17.ui, String(j), -270 + (j - 1) * 60, y - 180, 56, 76, function () {
                  if (_this17.store.commit(function (d) {
                    return d[key + 'Volume'] = j;
                  })) _this17.render();
                }, j <= _this17.store.data[key + 'Volume'] ? '#dcb47e' : '#d1dcbf');
              };
              for (var j = 1; j <= 10; j++) {
                _loop6(j);
              }
            });
          }
        };
        _proto.platform = function platform(method) {
          this.mission = {
            kind: method === 'addShortcut' ? 'shortcut' : 'entrance',
            status: 'Return through this TikTok entry to earn 30 Carrot Coins.',
            eligible: false,
            busy: false
          };
          this.modal = 'mission';
          this.render();
        };
        _proto.navigateMission = function navigateMission() {
          var _TTMinis,
            _this18 = this;
          var sdk = (_TTMinis = globalThis.TTMinis) == null ? void 0 : _TTMinis.game;
          var method = this.mission.kind === 'shortcut' ? 'addShortcut' : 'startEntranceMission';
          if (typeof (sdk == null ? void 0 : sdk[method]) !== 'function') {
            this.mission.status = 'This feature is available in TikTok.';
            this.render();
            return;
          }
          try {
            sdk[method]({
              success: function success() {
                return _this18.toast('Entry opened. Return here to check your reward.');
              },
              fail: function fail() {
                return _this18.toast('Could not open this entry. Please try again.');
              }
            });
          } catch (e) {
            this.toast('Could not open this entry. Please try again.');
          }
        };
        _proto.queryMission = function queryMission() {
          var _TTMinis2,
            _this19 = this;
          if (!this.mission) return;
          var mission = this.mission,
            token = ++this.missionSeq;
          mission.busy = true;
          mission.eligible = false;
          mission.status = 'Checking your visit…';
          mission.deadline = Date.now() + 8000;
          this.render();
          var sdk = (_TTMinis2 = globalThis.TTMinis) == null ? void 0 : _TTMinis2.game;
          var method = mission.kind === 'shortcut' ? 'getShortcutMissionReward' : 'getEntranceMissionReward';
          var finish = function finish(result, failed) {
            if (failed === void 0) {
              failed = false;
            }
            if (_this19.mission !== mission || _this19.missionSeq !== token || !mission.busy) return;
            mission.busy = false;
            mission.eligible = !failed && (result == null ? void 0 : result.canReceiveReward) === true;
            mission.status = failed ? 'Could not check this visit. Please retry.' : mission.eligible ? 'Your picnic reward is ready!' : 'Return through this TikTok entry, then check again.';
            _this19.render();
          };
          if (typeof (sdk == null ? void 0 : sdk[method]) !== 'function') {
            finish(null, true);
            this.mission.status = 'This feature is available in TikTok.';
            this.render();
            return;
          }
          try {
            var query = sdk[method]({
              success: function success(r) {
                return finish(r);
              },
              fail: function fail() {
                return finish(null, true);
              }
            });
            if (query != null && query.then) query.then(function (r) {
              return finish(r);
            }, function () {
              return finish(null, true);
            });
          } catch (e) {
            finish(null, true);
          }
        };
        _proto.hideAdModals = function hideAdModals() {
          this.hiddenAdModals = [];
          for (var _iterator5 = _createForOfIteratorHelperLoose(this.ui.children), _step5; !(_step5 = _iterator5()).done;) {
            var node = _step5.value;
            if (node.name === 'Modal Shield') {
              this.hiddenAdModals.push({
                node: node,
                active: node.active
              });
              node.active = false;
            }
          }
        };
        _proto.closeAdVisuals = function closeAdVisuals() {
          var _this$adPanel, _this$adShield;
          (_this$adPanel = this.adPanel) == null || _this$adPanel.destroy();
          this.adPanel = null;
          (_this$adShield = this.adShield) == null || _this$adShield.destroy();
          this.adShield = null;
          for (var _iterator6 = _createForOfIteratorHelperLoose(this.hiddenAdModals), _step6; !(_step6 = _iterator6()).done;) {
            var item = _step6.value;
            if (item.node.isValid) item.node.active = item.active;
          }
          this.hiddenAdModals = [];
        };
        _proto.watchAd = function watchAd(success, failure) {
          var _this20 = this,
            _TTMinis3;
          if (this.rewarded.busy) return this.toast('The previous video is still closing. Please wait.');
          var token = adGateStart(this.adGate);
          if (!token) return;
          var owner = this.generation;
          this.release();
          if (this.model) this.model.paused = true;
          AudioBridge.pause('ad');
          this.ad = {
            token: token,
            owner: owner
          };
          this.hideAdModals();
          this.adShield = this.box(this.root, 0, 0, 720, Math.max(1280, view.getVisibleSize().height), '#000000', 0, 'Modal Shield');
          this.adShield.addComponent(BlockInputEvents);
          this.adPanel = this.box(this.adShield, 0, 0, 610, 600, '#f5dfbc', 30, 'Popup Video status');
          this.adPanel.addComponent(BlockInputEvents);
          this.text(this.adPanel, 'Checking video…', 0, 188, 35, '#526b50', 500, 65);
          this.art.sprite(this.adPanel, 'art/gift/frame_00', 0, 25, 290, 245, 'contain', 'Video Gift Illustration');
          this.button(this.adPanel, 'Cancel', 0, -160, 400, 85, function () {
            AudioBridge.resume('ad');
            _this20.rewarded.cancelOwner(owner);
            adGateFinish(_this20.adGate, token, false);
            _this20.ad = null;
            _this20.closeAdVisuals();
            _this20.toast('Video request cancelled. No extra reward added.');
            failure == null || failure();
          }, '#cdddb7', true, true);
          var sdk = (_TTMinis3 = globalThis.TTMinis) == null ? void 0 : _TTMinis3.game;
          this.rewarded.run(sdk, PUBLIC_CONFIG.rewardedPlacementId, owner, function (complete, reason) {
            if (!_this20.ad || _this20.ad.token !== token) return;
            AudioBridge.resume('ad');
            _this20.ad = null;
            _this20.closeAdVisuals();
            var paid = adGateFinish(_this20.adGate, token, complete);
            if (owner !== _this20.generation) return;
            if (paid) success();else {
              _this20.toast(reason === 'unavailable' ? 'Video is unavailable here. You can keep playing for free.' : reason === 'timeout' ? 'The video did not respond. You can keep playing.' : 'Ad not completed. No extra reward added.');
              failure == null || failure();
            }
          });
        };
        _proto.cancelAd = function cancelAd() {
          AudioBridge.resume('ad');
          if (this.ad) {
            this.rewarded.cancelOwner(this.ad.owner);
            adGateFinish(this.adGate, this.ad.token, false);
            this.ad = null;
          }
          this.closeAdVisuals();
        };
        _proto.toast = function toast(str) {
          var _this$toastNode;
          (_this$toastNode = this.toastNode) == null || _this$toastNode.destroy();
          this.toastNode = this.box(this.root, 0, -485, 650, 125, '#f4d8b1', 25, 'Toast');
          this.dynamicText('toast_status', this.toastNode, str, 0, 0, 25, '#65784b', 610, 115);
          this.toastUntil = Date.now() + 3500;
        };
        _proto.update = function update(dt) {
          var _this$loadingTick, _this$mission;
          this.art.tick();
          if (this.page === 'loading' && (_this$loadingTick = this.loadingTick) != null && _this$loadingTick.isValid) this.loadingTick.setPosition(Math.sin(Date.now() / 500) * 100, 0);
          if ((_this$mission = this.mission) != null && _this$mission.busy && Date.now() > this.mission.deadline) {
            this.missionSeq++;
            this.mission.busy = false;
            this.mission.status = 'This check timed out. Please retry.';
            this.render();
          }
          this.transport.tick();
          this.artTransport.tick();
          this.rewarded.tick();
          if (this.loadDeadline && Date.now() > this.loadDeadline) this.loadFail('No resource progress');
          if (this.toastNode && Date.now() > this.toastUntil) {
            this.toastNode.destroy();
            this.toastNode = null;
          }
          this.artClock += Math.min(dt, .1);
          if (this.page === 'home' && this.giftArt) {
            var f = Math.floor(this.artClock * 8) % 10;
            if (f !== this.giftFrame) {
              this.giftFrame = f;
              this.giftArt.children.forEach(function (n, i) {
                return n.active = i === f;
              });
            }
          }
          if (this.page === 'home' && this.moving) {
            this.moving.setPosition(0, -15 + Math.sin(this.artClock * 1.5) * 9);
            this.moving.setScale(1 + Math.sin(this.artClock * 1.5) * .012, 1 + Math.sin(this.artClock * 1.5) * .012, 1);
            this.moving.angle = Math.sin(this.artClock * 1.1) * 1.3;
            if (this.titleArt) {
              this.titleArt.setPosition(0, 330 + Math.sin(this.artClock * .95) * 5);
              this.titleArt.angle = Math.sin(this.artClock * .8) * .7;
            }
          }
          if (this.page === 'game' && this.model && !this.modal) {
            this.accumulator += Math.min(dt, .1);
            var steps = 0;
            while (this.accumulator >= 1 / 120 && steps++ < 12) {
              this.model.step(1 / 120);
              this.accumulator -= 1 / 120;
            }
            if (this.model.result !== 'playing') {
              this.finish();
              return;
            }
            if (this.model.survivors < this.audioAlive) {
              AudioBridge.hazard('whisk');
              this.audioAlive = this.model.survivors;
            }
            if (this.model.held) {
              this.stepClock += dt;
              if (this.stepClock > .42) {
                this.stepClock = 0;
                AudioBridge.step();
              }
            }
            this.uiClock += dt;
            if (this.uiClock > .05) {
              this.uiClock = 0;
              this.drawCourse();
            }
          }
        };
        return PicnicGame;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/PicnicTouchButton.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, Button;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Button = module.Button;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "a03a5GKemNFoJOsIlMUeVPG", "PicnicTouchButton", undefined);
      var ccclass = _decorator.ccclass;
      /** Keep Cocos Button metadata; PicnicGame owns the guarded gesture callbacks. */
      var PicnicTouchButton = exports('PicnicTouchButton', (_dec = ccclass('PicnicTouchButton'), _dec(_class = /*#__PURE__*/function (_Button) {
        _inheritsLoose(PicnicTouchButton, _Button);
        function PicnicTouchButton() {
          return _Button.apply(this, arguments) || this;
        }
        var _proto = PicnicTouchButton.prototype;
        _proto._registerNodeEvent = function _registerNodeEvent() {};
        _proto._unregisterNodeEvent = function _unregisterNodeEvent() {};
        return PicnicTouchButton;
      }(Button)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/PublicConfig.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "233b53JyvBG1aLJfNbVr04A", "PublicConfig", undefined);
      var PUBLIC_CONFIG = exports('PUBLIC_CONFIG', {
        "profile": "PipsStarPop",
        "applicationMode": "shared-test",
        "appId": "7683427172773644296",
        "clientKey": "mgq7o8c3rbhdx2kv",
        "rewardedPlacementId": "ad7683199506230233095",
        "rewardedPlacements": [{
          "role": "revive",
          "id": "ad7683064432721709074"
        }, {
          "role": "help",
          "id": "ad7683076047361067016"
        }, {
          "role": "resources",
          "id": "ad7683199506230233095"
        }]
      });
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/RewardedSession.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _createClass, cclegacy;
  return {
    setters: [function (module) {
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "94c81Fbc9pJLa9smpLMXPTT", "RewardedSession", undefined);
      // Native session ownership survives UI cancellation and timeouts until the SDK ends that session.
      var RewardedSession = exports('RewardedSession', /*#__PURE__*/function () {
        function RewardedSession(now) {
          if (now === void 0) {
            now = function now() {
              return Date.now();
            };
          }
          this.active = null;
          this.now = void 0;
          this.now = now;
        }
        var _proto = RewardedSession.prototype;
        _proto.run = function run(sdk, adUnitId, owner, callback) {
          var _this = this;
          if (this.active) {
            callback(false, 'busy');
            return;
          }
          if (!(sdk != null && sdk.createRewardedVideoAd) || !adUnitId) {
            callback(false, 'unavailable');
            return;
          }
          var task = {
            owner: owner,
            callback: callback,
            settled: false,
            deadline: this.now() + 20000,
            ad: null,
            close: null,
            error: null
          };
          this.active = task;
          var business = function business(complete, reason) {
            if (task.settled) return;
            task.settled = true;
            task.callback == null || task.callback(complete, reason);
            task.callback = null;
          };
          var terminal = function terminal(complete, reason) {
            if (_this.active !== task) return;
            _this.active = null;
            try {
              var _task$ad, _task$ad2, _task$ad3;
              (_task$ad = task.ad) == null || _task$ad.offClose == null || _task$ad.offClose(task.close);
              (_task$ad2 = task.ad) == null || _task$ad2.offError == null || _task$ad2.offError(task.error);
              (_task$ad3 = task.ad) == null || _task$ad3.destroy == null || _task$ad3.destroy();
            } catch (e) {}
            business(complete, reason);
          };
          task.timeout = function () {
            return business(false, 'timeout');
          };
          try {
            task.ad = sdk.createRewardedVideoAd({
              adUnitId: adUnitId
            });
            task.close = function (result) {
              return terminal((result == null ? void 0 : result.isEnded) === true, (result == null ? void 0 : result.isEnded) === true ? 'completed' : 'cancelled');
            };
            task.error = function () {
              return terminal(false, 'failed');
            };
            task.ad.onClose(task.close);
            task.ad.onError(task.error);
            var showing = task.ad.show();
            if (showing != null && showing.then) showing.then(function () {
              if (_this.active === task && !task.settled) task.deadline = _this.now() + 180000;
            }, function () {
              return terminal(false, 'failed');
            });
          } catch (e) {
            terminal(false, 'failed');
          }
        };
        _proto.tick = function tick() {
          if (this.active && !this.active.settled && this.now() > this.active.deadline) this.active.timeout();
        };
        _proto.cancelOwner = function cancelOwner(owner) {
          var _this$active;
          if (((_this$active = this.active) == null ? void 0 : _this$active.owner) === owner) {
            this.active.settled = true;
            this.active.callback = null;
          }
        };
        _createClass(RewardedSession, [{
          key: "busy",
          get: function get() {
            return this.active !== null;
          }
        }]);
        return RewardedSession;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Rules.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _createForOfIteratorHelperLoose, _createClass, cclegacy;
  return {
    setters: [function (module) {
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "4bee4bmfOlF4KflNgu6u0/q", "Rules", undefined);
      var Parade = exports('Parade', /*#__PURE__*/function () {
        function Parade(c, sugar, freeze) {
          if (sugar === void 0) {
            sugar = 0;
          }
          if (freeze === void 0) {
            freeze = 0;
          }
          this.c = void 0;
          this.x = 0;
          this.time = 0;
          this.clock = 0;
          this.held = false;
          this.paused = false;
          this.result = 'playing';
          this.alive = [true, true, true, true];
          this.shield = 0;
          this.sugar = 0;
          this.freeze = 0;
          this.gateTimes = [];
          this.revived = false;
          this.heldTime = 0;
          this.releases = 0;
          this.c = c;
          this.sugar = sugar;
          this.freeze = freeze;
          this.gateTimes = c.gates.map(function () {
            return -1;
          });
        }
        var _proto = Parade.prototype;
        _proto.hazardActive = function hazardActive(h, lane, at) {
          if (lane === void 0) {
            lane = 0;
          }
          if (at === void 0) {
            at = this.clock;
          }
          return this.freeze <= 0 && (at + (h.phase || 0) + lane * .11) % h.cycle < h.active;
        };
        _proto.setHeld = function setHeld(value) {
          if (this.held && !value) this.releases++;
          this.held = value;
        };
        _proto.step = function step(dt) {
          var _this = this;
          if (this.paused || this.result !== 'playing' || !this.held && this.heldTime === 0 && this.x === 0) return;
          this.time += dt;
          if (this.freeze > 0) this.freeze = Math.max(0, this.freeze - dt);else this.clock += dt;
          this.shield = Math.max(0, this.shield - dt);
          this.c.gates.forEach(function (g, i) {
            if (_this.x >= g.plate && _this.gateTimes[i] < 0) _this.gateTimes[i] = _this.time;
          });
          if (this.held) {
            this.heldTime += dt;
            var speed = this.c.speed;
            if (this.c.zones.some(function (z) {
              return _this.x >= z.start && _this.x <= z.end;
            })) speed *= .5;
            var next = this.x + speed * dt;
            this.c.gates.forEach(function (g, i) {
              if (_this.gateTimes[i] >= 0 && _this.time - _this.gateTimes[i] < (g.delay || .35) && next > g.pos - 15 && _this.x < g.pos) next = g.pos - 15;
            });
            this.x = Math.min(this.c.length, next);
          }
          for (var _iterator = _createForOfIteratorHelperLoose(this.c.hazards), _step; !(_step = _iterator()).done;) {
            var h = _step.value;
            if (Math.abs(this.x - h.pos) > 12) continue;
            for (var i = 0; i < 4; i++) if (this.alive[i] && this.shield <= 0 && this.hazardActive(h, i)) {
              if (this.sugar > 0) {
                this.sugar--;
                this.shield = .3;
              } else this.alive[i] = false;
            }
          }
          if (!this.survivors) {
            this.result = 'lost';
            this.held = false;
          } else if (this.x >= this.c.length) {
            this.result = 'won';
            this.held = false;
          }
        };
        _proto.revive = function revive() {
          if (this.result !== 'lost' || this.revived) return false;
          this.alive[0] = true;
          this.shield = 3;
          this.result = 'playing';
          this.revived = true;
          this.held = false;
          return true;
        }
        // Preview advice only; never moves the player or grants a result.
        ;

        _proto.travelTime = function travelTime(distance) {
          var _this2 = this;
          var end = Math.max(this.x, Math.min(distance, this.c.length));
          var march = function march(a, b) {
            var t = Math.max(0, b - a) / _this2.c.speed;
            for (var _iterator2 = _createForOfIteratorHelperLoose(_this2.c.zones), _step2; !(_step2 = _iterator2()).done;) {
              var z = _step2.value;
              t += Math.max(0, Math.min(b, z.end) - Math.max(a, z.start)) / _this2.c.speed;
            }
            return t;
          };
          var wait = 0;
          for (var i = 0; i < this.c.gates.length; i++) {
            var g = this.c.gates[i],
              stop = g.pos - 15;
            if (stop >= this.x && stop < end) {
              var arrival = march(this.x, stop) + wait;
              var elapsed = this.gateTimes[i] >= 0 ? this.time - this.gateTimes[i] : -march(this.x, Math.max(this.x, g.plate)) - wait;
              wait += Math.max(0, (g.delay || .35) - elapsed - arrival);
            }
          }
          return march(this.x, end) + wait;
        };
        _proto.safeAt = function safeAt(h, arrival) {
          if (this.freeze > 0 && arrival <= this.freeze) return true;
          var at = this.clock + Math.max(0, arrival - this.freeze);
          return [0, 1, 2, 3].every(function (i) {
            return (at + (h.phase || 0) + i * .11) % h.cycle >= h.active;
          });
        };
        _createClass(Parade, [{
          key: "survivors",
          get: function get() {
            return this.alive.filter(Boolean).length;
          }
        }, {
          key: "stars",
          get: function get() {
            return this.survivors >= 3 ? 3 : this.survivors === 2 ? 2 : 1;
          }
        }]);
        return Parade;
      }());
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Save.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _extends, cclegacy;
  return {
    setters: [function (module) {
      _extends = module.extends;
    }, function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      exports('fresh', fresh);
      cclegacy._RF.push({}, "1cf05k8IQhG9Zb2R5iBJQX5", "Save", undefined);
      var SAVE_KEY = exports('SAVE_KEY', 'PipsPicnicParade:save:v1');
      function fresh(now) {
        if (now === void 0) {
          now = Date.now();
        }
        return {
          version: 1,
          coins: 0,
          pastries: 0,
          hearts: 5,
          regen: now,
          cleared: 0,
          stars: {},
          owned: ['hero_01', 'bg_01'],
          hero: 'hero_01',
          background: 'bg_01',
          gift: {
            charges: 1
          },
          freeze: 0,
          sugar: 0,
          music: true,
          sfx: true,
          musicVolume: 7,
          sfxVolume: 8,
          vibration: true,
          pending: null,
          trial: '',
          intro: [],
          receipts: [],
          nextRun: 1
        };
      }
      var SaveStore = exports('SaveStore', /*#__PURE__*/function () {
        function SaveStore(storage) {
          this.data = void 0;
          this.error = '';
          this.storage = void 0;
          this.storage = storage;
          this.data = fresh();
          var raw;
          try {
            raw = storage.getItem(SAVE_KEY);
            if (raw !== null && raw !== undefined && raw !== '') this.data = this.validate(JSON.parse(raw));
          } catch (e) {
            this.error = 'Save data could not be read. A fresh picnic is ready.';
            if (typeof raw === 'string') try {
              storage.setItem(SAVE_KEY + ':recovery:' + Date.now(), raw);
            } catch (writeError) {/* Preserve the primary save if even the recovery copy cannot be written. */}
          }
          this.recover();
        }
        var _proto = SaveStore.prototype;
        _proto.validate = function validate(d) {
          var _d$gift;
          var f = fresh();
          if (!d || typeof d !== 'object' || Array.isArray(d)) throw Error('invalid save');
          for (var _i = 0, _arr = ['coins', 'pastries', 'hearts', 'cleared', 'freeze', 'sugar', 'musicVolume', 'sfxVolume', 'nextRun']; _i < _arr.length; _i++) {
            var k = _arr[_i];
            if (d[k] !== undefined && (!Number.isFinite(d[k]) || d[k] < 0)) d[k] = f[k];
          }
          d = _extends({}, f, d);
          d.coins = Math.min(999999, Math.floor(d.coins));
          d.pastries = Math.min(9999, Math.floor(d.pastries));
          d.hearts = Math.min(5, Math.floor(d.hearts));
          d.cleared = Math.min(70, Math.floor(d.cleared));
          for (var _i2 = 0, _arr2 = ['owned', 'intro', 'receipts']; _i2 < _arr2.length; _i2++) {
            var _k = _arr2[_i2];
            if (!Array.isArray(d[_k])) d[_k] = f[_k];
          }
          if (!d.stars || typeof d.stars !== 'object' || Array.isArray(d.stars)) d.stars = {};
          if (!Number.isFinite(d.regen)) d.regen = Date.now();
          d.gift = {
            charges: ((_d$gift = d.gift) == null ? void 0 : _d$gift.charges) > 0 ? 1 : 0
          };
          d.musicVolume = Math.min(10, d.musicVolume);
          d.sfxVolume = Math.min(10, d.sfxVolume);
          for (var _i3 = 0, _arr3 = ['music', 'sfx', 'vibration']; _i3 < _arr3.length; _i3++) {
            var key = _arr3[_i3];
            if (typeof d[key] !== 'boolean') d[key] = f[key];
          }
          for (var _i4 = 0, _arr4 = ['hero', 'background', 'trial']; _i4 < _arr4.length; _i4++) {
            var _key = _arr4[_i4];
            if (typeof d[_key] !== 'string') d[_key] = f[_key];
          }
          d.owned = d.owned.filter(function (v) {
            return typeof v === 'string';
          });
          if (!d.owned.includes('hero_01')) d.owned.push('hero_01');
          if (!d.owned.includes('bg_01')) d.owned.push('bg_01');
          if (d.pending && (!Number.isFinite(d.pending.coins) || !Number.isFinite(d.pending.level) || typeof d.pending.id !== 'string')) d.pending = null;
          return d;
        };
        _proto.commit = function commit(change) {
          var draft = JSON.parse(JSON.stringify(this.data));
          change(draft);
          try {
            this.storage.setItem(SAVE_KEY, JSON.stringify(draft));
            this.data = draft;
            this.error = '';
            return true;
          } catch (e) {
            this.error = 'Could not save. Please try again.';
            return false;
          }
        };
        _proto.recover = function recover(now) {
          if (now === void 0) {
            now = Date.now();
          }
          if (this.data.hearts >= 5) {
            if (this.data.regen !== now) this.commit(function (d) {
              return d.regen = now;
            });
            return;
          }
          var ticks = Math.max(0, Math.floor((now - this.data.regen) / 1200000));
          if (ticks) this.commit(function (d) {
            d.hearts = Math.min(5, d.hearts + ticks);
            d.regen += ticks * 1200000;
          });
        };
        _proto.reward = function reward(id, fn) {
          if (this.data.receipts.includes(id)) return false;
          return this.commit(function (d) {
            if (d.receipts.includes(id)) return;
            fn(d);
            d.receipts.push(id);
            if (d.receipts.length > 500) d.receipts = d.receipts.slice(-500);
          });
        };
        return SaveStore;
      }());
      cclegacy._RF.pop();
    }
  };
});

(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});