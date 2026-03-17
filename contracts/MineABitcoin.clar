;; title: MineABitcoin
;; version: 0.2.0
;; summary: Block Economy Core - Steady Dig Mode
;; description: Bitcoin-powered mining game where players buy hashes with sBTC across rounds.
;; clarity_version: 3 (required for as-contract vault pattern with SIP-010 tokens)

;; ---------------------------------------------------------
;; SIP-010 Fungible Token Trait
;; ---------------------------------------------------------

(define-trait sip-010-trait
  (
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    (get-name () (response (string-ascii 32) uint))
    (get-symbol () (response (string-ascii 32) uint))
    (get-decimals () (response uint uint))
    (get-balance (principal) (response uint uint))
    (get-total-supply () (response uint uint))
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)

;; ---------------------------------------------------------
;; Constants
;; ---------------------------------------------------------

(define-constant CONTRACT-OWNER tx-sender)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u1000))
(define-constant ERR-GAME-NOT-ONGOING (err u1001))
(define-constant ERR-GAME-NOT-COOLDOWN (err u1002))
(define-constant ERR-INVALID-RIG (err u1003))
(define-constant ERR-ZERO-HASHES (err u1004))
(define-constant ERR-MINER-TAG-TAKEN (err u1005))
(define-constant ERR-MINER-TAG-TOO-SHORT (err u1006))
(define-constant ERR-MINER-TAG-TOO-LONG (err u1007))
(define-constant ERR-ALREADY-REGISTERED (err u1008))
(define-constant ERR-RESERVED-TAG (err u1009))
(define-constant ERR-INSUFFICIENT-PAYMENT (err u1011))
(define-constant ERR-NO-REWARD (err u1013))
(define-constant ERR-NOT-WINNER (err u1014))
(define-constant ERR-OVERFLOW (err u1015))
(define-constant ERR-INVALID-TOKEN (err u1016))
(define-constant ERR-ROUND-ENDED (err u1017))
(define-constant ERR-INVALID-VALUE (err u1018))
(define-constant ERR-PRICE-NEGATIVE (err u1019))

;; Game states
(define-constant STATE-ONGOING u1)
(define-constant STATE-COOLDOWN u2)

;; Mining rig types
(define-constant RIG-CPU u1)     ;; solo
(define-constant RIG-GPU u2)     ;; pool
(define-constant RIG-FPGA u3)    ;; attack51
(define-constant RIG-ASIC u4)    ;; cloud

;; Pricing constants (in sats = smallest sBTC unit)
(define-constant PRICE-BASE u547)
(define-constant PRICE-CEILING u100000)
(define-constant PRICE-MID u15000)
(define-constant PRICE-FAST u80000)

(define-constant HASHES-MID u40000)
(define-constant HASHES-FAST-END u120000)
(define-constant HASHES-CEILING u200000)

;; Precision for mask-based reward accounting (1e18)
(define-constant PRECISION u1000000000000000000)

;; Percentage basis (10000 = 100%)
(define-constant BASIS u10000)

;; Pyth BTC/USD price feed ID
(define-constant BTC-USD-FEED-ID 0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43)

;; Token decimal constants
(define-constant USDCX-DECIMALS u1000000)     ;; 1e6
(define-constant SBTC-DECIMALS u100000000)    ;; 1e8

;; Hashes required per block to prevent countdown
(define-constant HASHES-PER-BLOCK u20)

;; Maximum bonus blocks that can be earned in a single purchase
(define-constant MAX-OVERFLOW-PER-BUY u144)

;; ---------------------------------------------------------
;; Configurable Data Variables
;; ---------------------------------------------------------

;; sBTC token contract principal (configurable for testnet/mainnet)
(define-data-var sbtc principal 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token)

;; USDCx token contract principal (configurable for testnet/mainnet)
(define-data-var usdcx principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.mock-usdcx-token)

;; Referral code registration fee (in sats)
(define-data-var referral-fee uint u10000)

;; Round duration in Bitcoin blocks (default: 1008 = ~7 days)
(define-data-var blocks-per-round uint u1008)

;; Cooldown duration in Bitcoin blocks (default: 72 = ~12 hours)
(define-data-var cooldown-blocks uint u72)

;; ---------------------------------------------------------
;; Game State Data Variables
;; ---------------------------------------------------------

(define-data-var current-round uint u1)
(define-data-var game-state uint STATE-ONGOING)

;; Block height when current round started (set on deployment and on each new round)
(define-data-var round-start-height uint burn-block-height)

;; Block height when cooldown started
(define-data-var cooldown-start-height uint u0)

;; Global hash counters per rig type
(define-data-var total-cpu-hashes uint u0)
(define-data-var total-gpu-hashes uint u0)
(define-data-var total-fpga-hashes uint u0)
(define-data-var total-asic-hashes uint u0)
(define-data-var total-hashes uint u0)

;; Pools (in sats)
(define-data-var mining-reward-pool uint u0)
(define-data-var mining-shares-pool uint u0)
(define-data-var token-holders-pool uint u0)
(define-data-var free-hunt-pool uint u0)
(define-data-var next-round-pool uint u0)
(define-data-var airdrop-pool uint u0)
(define-data-var dev-pool uint u0)

;; USDCx pools (mirror sBTC pools, tracked in USDCx micro-units)
(define-data-var mining-reward-pool-usdcx uint u0)
(define-data-var mining-shares-pool-usdcx uint u0)
(define-data-var token-holders-pool-usdcx uint u0)
(define-data-var free-hunt-pool-usdcx uint u0)
(define-data-var next-round-pool-usdcx uint u0)
(define-data-var airdrop-pool-usdcx uint u0)
(define-data-var dev-pool-usdcx uint u0)

;; Reward mask (global accumulator for mining shares)
(define-data-var global-mask uint u0)

;; Miner count
(define-data-var unique-miners uint u0)

;; Last miner (winner candidate)
(define-data-var last-miner (optional principal) none)

;; Block extension mechanic: hashes buy extra blocks
;; Carry-over hashes from last processed block (halved each block transition)
(define-data-var carry-hashes uint u0)
;; Last block height where hash carry was processed
(define-data-var last-hash-height uint burn-block-height)
;; Total bonus blocks earned from hash purchases
(define-data-var block-overflow uint u0)

;; ---------------------------------------------------------
;; Mining Shares Tracking
;; ---------------------------------------------------------

;; All-time cumulative shares added to pool
(define-data-var total-shares-earned uint u0)
;; All-time cumulative shares paid out
(define-data-var total-shares-paid uint u0)

;; Rolling window for hourly payout tracking (~6 blocks/hr on mainnet)
(define-constant BLOCKS-PER-HOUR u6)
(define-data-var hourly-window-start uint burn-block-height)
(define-data-var hourly-paid-current uint u0)
(define-data-var hourly-paid-previous uint u0)

;; Rolling window for daily payout tracking (~144 blocks/day on mainnet)
(define-constant BLOCKS-PER-DAY u144)
(define-data-var daily-window-start uint burn-block-height)
(define-data-var daily-paid-current uint u0)
(define-data-var daily-paid-previous uint u0)

;; ---------------------------------------------------------
;; Data Maps
;; ---------------------------------------------------------

;; Miner tag registry: bidirectional mapping
(define-map tag-to-principal (string-ascii 24) principal)
(define-map principal-to-tag principal (string-ascii 24))

;; Miner state per round
(define-map miner-state
  { miner: principal, round: uint }
  {
    hashes: uint,
    rig: uint,
    mask: uint,
    pending: uint
  }
)

;; Referral mapping: miner -> referrer principal (permanent once set)
(define-map miner-referrer principal principal)

;; Referral earnings (cumulative tracking - paid directly on each buy)
(define-map referral-earnings principal uint)
;; Referral earnings in USDCx (actual micro-units, not sat-equivalent)
(define-map referral-earnings-usdcx principal uint)

;; Total withdrawn by each miner (cumulative across all claims)
(define-map total-withdrawn principal uint)

;; Snapshot of global-mask at round end (for cross-round claims)
(define-map round-final-mask uint uint)

;; Hashes purchased at each Bitcoin block height per round
(define-map block-hashes
  { round: uint, block-height: uint }
  uint
)

;; Unclaimed mining reward snapshots per round (set on round reset)
(define-map round-unclaimed-reward uint uint)
(define-map round-unclaimed-reward-usdcx uint uint)
(define-map round-total-hashes uint uint)

;; Last active round per miner (for lazy unclaimed reward settlement)
(define-map miner-last-round principal uint)

;; Accumulated unclaimed reward balances per miner (claimable separately)
(define-map miner-unclaimed-sbtc principal uint)
(define-map miner-unclaimed-usdcx principal uint)

;; ---------------------------------------------------------
;; Private: sBTC Vault (as-contract pattern)
;; ---------------------------------------------------------

;; Validate that the provided token matches the stored sBTC principal
(define-private (check-token (token principal))
  (is-eq token (var-get sbtc))
)

;; Validate that the provided token is USDCx
(define-private (check-token-usdcx (token principal))
  (is-eq token (var-get usdcx))
)

;; ---------------------------------------------------------
;; Private: Pyth Oracle Price Helpers
;; ---------------------------------------------------------

;; Power of 10 helper (Clarity lacks pow). Supports exponents 0-10.
(define-private (pow10 (n uint))
  (if (is-eq n u0) u1
    (if (is-eq n u1) u10
      (if (is-eq n u2) u100
        (if (is-eq n u3) u1000
          (if (is-eq n u4) u10000
            (if (is-eq n u5) u100000
              (if (is-eq n u6) u1000000
                (if (is-eq n u7) u10000000
                  (if (is-eq n u8) u100000000
                    (if (is-eq n u9) u1000000000
                      u10000000000
                    ))))))))))
)

;; Update Pyth oracle with fresh VAA and read BTC/USD price.
;; Returns { price: uint, expo: uint } where expo is the absolute exponent.
;; For simnet: calls mock-pyth-oracle. For testnet/mainnet: swap to real Pyth addresses.
(define-private (update-and-get-btc-price (price-feed-bytes (buff 8192)))
  (begin
    ;; Verify and update the price feed with the provided VAA
    (try! (contract-call? .mock-pyth-oracle verify-and-update-price-feeds price-feed-bytes))
    ;; Read the updated price
    (let
      (
        (price-data (try! (contract-call? .mock-pyth-oracle read-price-feed BTC-USD-FEED-ID)))
        (raw-price (get price price-data))
        (raw-expo (get expo price-data))
      )
      ;; Price must be positive
      (asserts! (> raw-price 0) ERR-PRICE-NEGATIVE)
      ;; Convert negative exponent to absolute value (Pyth exponents are negative for USD prices)
      (let
        (
          (abs-expo (if (< raw-expo 0) (to-uint (- 0 raw-expo)) u0))
        )
        (ok { price: (to-uint raw-price), expo: abs-expo })
      )
    )
  )
)

;; Convert a sat amount to USDCx micro-units using BTC/USD price.
;; Formula: usdcx = sats * price * USDCX_DECIMALS / (pow10(expo) * SBTC_DECIMALS)
;; Example: 10000 sats, price=8350000, expo=2 = $83,500
;;   = 10000 * 8350000 * 1e6 / (100 * 1e8) = 835000 USDCx (~$0.835)
(define-private (sats-to-usdcx (sats uint) (btc-price uint) (abs-expo uint))
  (let
    (
      (scale (pow10 abs-expo))
      (numerator (* sats (* btc-price USDCX-DECIMALS)))
      (denominator (* scale SBTC-DECIMALS))
    )
    (/ numerator denominator)
  )
)

;; Convert USDCx micro-units to sat-equivalent using BTC/USD price.
;; Formula: sats = usdcx * pow10(expo) * SBTC_DECIMALS / (price * USDCX_DECIMALS)
(define-private (usdcx-to-sats (usdcx-amount uint) (btc-price uint) (abs-expo uint))
  (let
    (
      (scale (pow10 abs-expo))
      (numerator (* usdcx-amount (* scale SBTC-DECIMALS)))
      (denominator (* btc-price USDCX-DECIMALS))
    )
    (/ numerator denominator)
  )
)

;; Transfer sBTC from caller into the contract vault
(define-private (vault-deposit (token <sip-010-trait>) (sender principal) (amount uint))
  (contract-call? token transfer
    amount
    sender
    (as-contract tx-sender)
    none
  )
)

;; Transfer sBTC from the contract vault to a recipient
(define-private (vault-withdraw (token <sip-010-trait>) (recipient principal) (amount uint))
  (as-contract
    (contract-call? token transfer
      amount
      tx-sender
      recipient
      none
    )
  )
)

;; ---------------------------------------------------------
;; Private: Block-height-based round status check
;; ---------------------------------------------------------

;; Checks whether the round has ended based on actual Bitcoin block height.
;; Accounts for bonus blocks earned from hash purchases.
;; If blocks elapsed >= (blocks-per-round + block-overflow), transitions to COOLDOWN.
;; Called at the start of every public function that needs up-to-date state.
(define-private (reset-round-state)
  (let
    (
      (ending-round (var-get current-round))
    )
    ;; Snapshot unclaimed mining reward and total hashes for the ending round
    (map-set round-unclaimed-reward ending-round (var-get mining-reward-pool))
    (map-set round-unclaimed-reward-usdcx ending-round (var-get mining-reward-pool-usdcx))
    (map-set round-total-hashes ending-round (var-get total-hashes))
    ;; Snapshot the final global mask for the ending round (enables cross-round claims)
    (map-set round-final-mask ending-round (var-get global-mask))
    ;; Reset for new round
    (var-set current-round (+ ending-round u1))
    (var-set game-state STATE-ONGOING)
    (var-set round-start-height burn-block-height)
    (var-set total-cpu-hashes u0)
    (var-set total-gpu-hashes u0)
    (var-set total-fpga-hashes u0)
    (var-set total-asic-hashes u0)
    (var-set total-hashes u0)
    ;; Carry over next-round pool only (unclaimed reward tracked separately per round)
    (var-set mining-reward-pool (var-get next-round-pool))
    (var-set next-round-pool u0)
    (var-set mining-shares-pool u0)
    (var-set airdrop-pool u0)
    ;; Carry over USDCx next-round pool only
    (var-set mining-reward-pool-usdcx (var-get next-round-pool-usdcx))
    (var-set next-round-pool-usdcx u0)
    (var-set mining-shares-pool-usdcx u0)
    (var-set airdrop-pool-usdcx u0)
    (var-set global-mask u0)
    (var-set unique-miners u0)
    (var-set last-miner none)
    ;; Reset block extension state
    (var-set carry-hashes u0)
    (var-set last-hash-height burn-block-height)
    (var-set block-overflow u0)
    true
  )
)

(define-private (check-and-update-round-status)
  (let
    (
      (effective-duration (+ (var-get blocks-per-round) (var-get block-overflow)))
      (start-height (var-get round-start-height))
      (elapsed (- burn-block-height start-height))
    )
    ;; ONGOING = COOLDOWN transition: round time ran out
    (if (and (is-eq (var-get game-state) STATE-ONGOING) (>= elapsed effective-duration))
      (begin
        (var-set game-state STATE-COOLDOWN)
        (var-set cooldown-start-height (+ start-height effective-duration))
        true
      )
      ;; COOLDOWN = ONGOING transition: cooldown period expired, auto-start new round
      (if (and (is-eq (var-get game-state) STATE-COOLDOWN)
               (>= burn-block-height (+ (var-get cooldown-start-height) (var-get cooldown-blocks))))
        (reset-round-state)
        false
      )
    )
  )
)

;; Compute current blocks remaining from burn-block-height (includes bonus blocks)
(define-private (compute-blocks-remaining)
  (let
    (
      (effective-duration (+ (var-get blocks-per-round) (var-get block-overflow)))
      (elapsed (- burn-block-height (var-get round-start-height)))
    )
    (if (>= elapsed effective-duration) u0 (- effective-duration elapsed))
  )
)

;; ---------------------------------------------------------
;; Private: Hash carry mechanic (block extension)
;; ---------------------------------------------------------
;; 20 hashes per block saves that block from countdown.
;; Unused hashes carry to next block but get halved each transition.

(define-private (process-hash-carry (hash-amount uint))
  (let
    (
      (current-height burn-block-height)
      (last-height (var-get last-hash-height))
      (gap (if (> current-height last-height) (- current-height last-height) u0))
      (old-carry (var-get carry-hashes))
      ;; Decay carry: halve once per block transition
      ;; carry < 20 always, so after 5 halvings it's guaranteed 0
      (decayed (if (is-eq gap u0)
        old-carry
        (if (>= gap u5) u0 (/ old-carry (bit-shift-left u1 gap)))
      ))
      (effective (+ decayed hash-amount))
      (raw-saved (/ effective HASHES-PER-BLOCK))
      ;; Cap bonus blocks at 144 per purchase
      (blocks-saved (if (> raw-saved MAX-OVERFLOW-PER-BUY) MAX-OVERFLOW-PER-BUY raw-saved))
      ;; If capped, keep only the hashes that weren't counted
      (hashes-used (* blocks-saved HASHES-PER-BLOCK))
      (new-carry (- effective hashes-used))
    )
    ;; Cap total block-overflow at blocks-per-round (1008)
    (let
      (
        (current-overflow (var-get block-overflow))
        (max-overflow (var-get blocks-per-round))
        (room (if (>= max-overflow current-overflow) (- max-overflow current-overflow) u0))
        (capped-saved (if (> blocks-saved room) room blocks-saved))
      )
      (var-set block-overflow (+ current-overflow capped-saved))
    )
    (var-set carry-hashes new-carry)
    (var-set last-hash-height current-height)
    blocks-saved
  )
)

;; ---------------------------------------------------------
;; Private: Mining shares tracking
;; ---------------------------------------------------------

;; Record shares earned (added to pool)
(define-private (record-shares-earned (amount uint))
  (var-set total-shares-earned (+ (var-get total-shares-earned) amount))
)

;; Record shares paid out with rolling window tracking
(define-private (record-shares-paid (amount uint))
  (let
    (
      (current-height burn-block-height)
    )
    ;; Update all-time total
    (var-set total-shares-paid (+ (var-get total-shares-paid) amount))

    ;; Rotate hourly window if needed
    (if (>= (- current-height (var-get hourly-window-start)) BLOCKS-PER-HOUR)
      (begin
        (var-set hourly-paid-previous (var-get hourly-paid-current))
        (var-set hourly-paid-current amount)
        (var-set hourly-window-start current-height)
      )
      (var-set hourly-paid-current (+ (var-get hourly-paid-current) amount))
    )

    ;; Rotate daily window if needed
    (if (>= (- current-height (var-get daily-window-start)) BLOCKS-PER-DAY)
      (begin
        (var-set daily-paid-previous (var-get daily-paid-current))
        (var-set daily-paid-current amount)
        (var-set daily-window-start current-height)
      )
      (var-set daily-paid-current (+ (var-get daily-paid-current) amount))
    )
  )
)

;; ---------------------------------------------------------
;; Private: Per-block hash tracking
;; ---------------------------------------------------------

;; Record hashes purchased at the current burn-block-height
(define-private (track-block-hashes (round uint) (amount uint))
  (let
    (
      (current-block burn-block-height)
      (existing (default-to u0 (map-get? block-hashes { round: round, block-height: current-block })))
    )
    (map-set block-hashes
      { round: round, block-height: current-block }
      (+ existing amount)
    )
  )
)

;; ---------------------------------------------------------
;; Private: Pricing Math (integral / area-under-curve)
;; ---------------------------------------------------------

;; Instantaneous price at supply level N
(define-read-only (get-price-at (n uint))
  (if (>= n HASHES-CEILING)
    PRICE-CEILING
    (if (>= n HASHES-FAST-END)
      ;; Phase 3: linear FAST -> CEILING
      (let
        (
          (k (- n HASHES-FAST-END))
          (range (- HASHES-CEILING HASHES-FAST-END))
          (price-delta (- PRICE-CEILING PRICE-FAST))
        )
        (+ PRICE-FAST (/ (* price-delta k) range))
      )
      (if (>= n HASHES-MID)
        ;; Phase 2: quadratic MID -> FAST
        (let
          (
            (k (- n HASHES-MID))
            (range (- HASHES-FAST-END HASHES-MID))
            (price-delta (- PRICE-FAST PRICE-MID))
          )
          (+ PRICE-MID (/ (* price-delta (/ (* k k) range)) range))
        )
        ;; Phase 1: linear BASE -> MID
        (+ PRICE-BASE (/ (* (- PRICE-MID PRICE-BASE) n) HASHES-MID))
      )
    )
  )
)

;; Phase 1 integral (linear): integral(BASE + slope*x)dx from s0 to s1
(define-private (cost-phase1 (s0 uint) (s1 uint))
  (let
    (
      (delta (- s1 s0))
      (sum-s (+ s1 s0))
      (price-delta (- PRICE-MID PRICE-BASE))
      (base-cost (* PRICE-BASE delta))
      (slope-cost (/ (* price-delta (* sum-s delta)) (* u2 HASHES-MID)))
    )
    (+ base-cost slope-cost)
  )
)

;; Phase 2 integral (quadratic): integral(MID_PRICE + dprice * k^2/range^2)dk
(define-private (cost-phase2 (s0 uint) (s1 uint))
  (let
    (
      (k0 (- s0 HASHES-MID))
      (k1 (- s1 HASHES-MID))
      (delta (- k1 k0))
      (range (- HASHES-FAST-END HASHES-MID))
      (range-sq (* range range))
      (price-delta (- PRICE-FAST PRICE-MID))
      (base-cost (* PRICE-MID delta))
      ;; k1^3 - k0^3 = (k1 - k0)(k1^2 + k1*k0 + k0^2)
      (sum-sq (+ (* k1 k1) (+ (* k1 k0) (* k0 k0))))
      (cube-diff (* delta sum-sq))
      (quad-cost (/ (* price-delta cube-diff) (* u3 range-sq)))
    )
    (+ base-cost quad-cost)
  )
)

;; Phase 3 integral (linear): integral(FAST_PRICE + slope*k)dk
(define-private (cost-phase3 (s0 uint) (s1 uint))
  (let
    (
      (k0 (- s0 HASHES-FAST-END))
      (k1 (- s1 HASHES-FAST-END))
      (delta (- k1 k0))
      (sum-k (+ k1 k0))
      (range (- HASHES-CEILING HASHES-FAST-END))
      (price-delta (- PRICE-CEILING PRICE-FAST))
      (base-cost (* PRICE-FAST delta))
      (slope-cost (/ (* price-delta (* sum-k delta)) (* u2 range)))
    )
    (+ base-cost slope-cost)
  )
)

;; Phase 4 (flat ceiling)
(define-private (cost-phase4 (s0 uint) (s1 uint))
  (* PRICE-CEILING (- s1 s0))
)

;; Total sBTC cost to buy `amount` hashes starting at `supply`
;; Splits across phase boundaries and sums integrals
(define-read-only (get-cost-for-hashes (supply uint) (amount uint))
  (let
    (
      (end (+ supply amount))
      ;; Phase 1: [supply .. min(end, MID)]
      (c1 (if (and (< supply HASHES-MID) (> end supply))
            (cost-phase1 supply (if (< end HASHES-MID) end HASHES-MID))
            u0))
      ;; Phase 2: [max(supply, MID) .. min(end, FAST_END)]
      (s2 (if (< supply HASHES-MID) HASHES-MID supply))
      (c2 (if (and (< s2 HASHES-FAST-END) (> end s2) (>= end HASHES-MID))
            (cost-phase2 (if (< s2 HASHES-MID) HASHES-MID s2) (if (< end HASHES-FAST-END) end HASHES-FAST-END))
            u0))
      ;; Phase 3: [max(supply, FAST_END) .. min(end, CEILING)]
      (s3 (if (< supply HASHES-FAST-END) HASHES-FAST-END supply))
      (c3 (if (and (< s3 HASHES-CEILING) (> end s3) (>= end HASHES-FAST-END))
            (cost-phase3 (if (< s3 HASHES-FAST-END) HASHES-FAST-END s3) (if (< end HASHES-CEILING) end HASHES-CEILING))
            u0))
      ;; Phase 4: [max(supply, CEILING) .. end]
      (s4 (if (< supply HASHES-CEILING) HASHES-CEILING supply))
      (c4 (if (and (>= end HASHES-CEILING) (> end s4))
            (cost-phase4 (if (< s4 HASHES-CEILING) HASHES-CEILING s4) end)
            u0))
    )
    (+ c1 (+ c2 (+ c3 c4)))
  )
)

;; ---------------------------------------------------------
;; Private: Distribution helpers
;; ---------------------------------------------------------

;; Rig allocation percentages (in basis points)
(define-read-only (get-rig-allocations (rig uint))
  (if (is-eq rig RIG-CPU)
    { reward: u2000, shares: u5500, token-holders: u1500 }
    (if (is-eq rig RIG-GPU)
      { reward: u4000, shares: u4500, token-holders: u500 }
      (if (is-eq rig RIG-FPGA)
        { reward: u4000, shares: u3500, token-holders: u1000 }
        { reward: u3500, shares: u5000, token-holders: u500 }
      )
    )
  )
)

;; Distribute sBTC payment across pools
(define-private (distribute-payment (amount uint) (rig uint) (has-referrer bool))
  (let
    (
      (allocs (get-rig-allocations rig))
      (to-reward (/ (* amount (get reward allocs)) BASIS))
      (to-shares (/ (* amount (get shares allocs)) BASIS))
      (to-token-holders (/ (* amount (get token-holders allocs)) BASIS))
      (to-free-hunt (/ (* amount u80) BASIS))
      (to-next-round (/ (* amount u20) BASIS))
      (to-airdrop (/ (* amount u100) BASIS))
      (to-referrer (/ (* amount u700) BASIS))
      (allocated (+ to-reward (+ to-shares (+ to-token-holders (+ to-free-hunt (+ to-next-round (+ to-airdrop to-referrer)))))))
      (to-dev (- amount allocated))
    )
    (begin
      (var-set mining-reward-pool (+ (var-get mining-reward-pool) to-reward))
      (var-set mining-shares-pool (+ (var-get mining-shares-pool) to-shares))
      (record-shares-earned to-shares)
      (var-set token-holders-pool (+ (var-get token-holders-pool) to-token-holders))
      (var-set free-hunt-pool (+ (var-get free-hunt-pool) to-free-hunt))
      (var-set next-round-pool (+ (var-get next-round-pool) to-next-round))
      (var-set airdrop-pool (+ (var-get airdrop-pool) to-airdrop))
      (if has-referrer
        (var-set dev-pool (+ (var-get dev-pool) to-dev))
        (var-set dev-pool (+ (var-get dev-pool) (+ to-dev to-referrer)))
      )
      {
        to-referrer: (if has-referrer to-referrer u0),
        to-shares: to-shares
      }
    )
  )
)

;; Distribute USDCx payment across USDCx pools (mirrors distribute-payment)
;; amount-usdcx: actual USDCx micro-units to track in pools
;; amount-sats: sat-equivalent for mask accounting (computed via oracle)
(define-private (distribute-payment-usdcx (amount-usdcx uint) (amount-sats uint) (rig uint) (has-referrer bool))
  (let
    (
      (allocs (get-rig-allocations rig))
      ;; USDCx pool splits (proportional to the actual USDCx amount)
      (to-reward-usdcx (/ (* amount-usdcx (get reward allocs)) BASIS))
      (to-shares-usdcx (/ (* amount-usdcx (get shares allocs)) BASIS))
      (to-token-holders-usdcx (/ (* amount-usdcx (get token-holders allocs)) BASIS))
      (to-free-hunt-usdcx (/ (* amount-usdcx u80) BASIS))
      (to-next-round-usdcx (/ (* amount-usdcx u20) BASIS))
      (to-airdrop-usdcx (/ (* amount-usdcx u100) BASIS))
      (to-referrer-usdcx (/ (* amount-usdcx u700) BASIS))
      (allocated-usdcx (+ to-reward-usdcx (+ to-shares-usdcx (+ to-token-holders-usdcx (+ to-free-hunt-usdcx (+ to-next-round-usdcx (+ to-airdrop-usdcx to-referrer-usdcx)))))))
      (to-dev-usdcx (- amount-usdcx allocated-usdcx))
      ;; Sat-equivalent for mask accounting
      (to-shares-sats (/ (* amount-sats (get shares allocs)) BASIS))
    )
    (begin
      (var-set mining-reward-pool-usdcx (+ (var-get mining-reward-pool-usdcx) to-reward-usdcx))
      (var-set mining-shares-pool-usdcx (+ (var-get mining-shares-pool-usdcx) to-shares-usdcx))
      (record-shares-earned to-shares-sats)
      (var-set token-holders-pool-usdcx (+ (var-get token-holders-pool-usdcx) to-token-holders-usdcx))
      (var-set free-hunt-pool-usdcx (+ (var-get free-hunt-pool-usdcx) to-free-hunt-usdcx))
      (var-set next-round-pool-usdcx (+ (var-get next-round-pool-usdcx) to-next-round-usdcx))
      (var-set airdrop-pool-usdcx (+ (var-get airdrop-pool-usdcx) to-airdrop-usdcx))
      (if has-referrer
        (var-set dev-pool-usdcx (+ (var-get dev-pool-usdcx) to-dev-usdcx))
        (var-set dev-pool-usdcx (+ (var-get dev-pool-usdcx) (+ to-dev-usdcx to-referrer-usdcx)))
      )
      {
        to-referrer-usdcx: (if has-referrer to-referrer-usdcx u0),
        to-shares-sats: to-shares-sats
      }
    )
  )
)

;; ---------------------------------------------------------
;; Private: Rig counter helpers
;; ---------------------------------------------------------

(define-private (increment-rig-counter (rig uint) (amount uint))
  (if (is-eq rig RIG-CPU)
    (var-set total-cpu-hashes (+ (var-get total-cpu-hashes) amount))
    (if (is-eq rig RIG-GPU)
      (var-set total-gpu-hashes (+ (var-get total-gpu-hashes) amount))
      (if (is-eq rig RIG-FPGA)
        (var-set total-fpga-hashes (+ (var-get total-fpga-hashes) amount))
        (var-set total-asic-hashes (+ (var-get total-asic-hashes) amount))
      )
    )
  )
)

;; ---------------------------------------------------------
;; Private: Reserved tag check (blocks route-like tags)
;; ---------------------------------------------------------

(define-private (is-reserved-tag (tag (string-ascii 24)))
  (or (is-eq tag "home")
    (or (is-eq tag "about")
      (or (is-eq tag "how-to-play")
        (or (is-eq tag "dashboard")
          (or (is-eq tag "admin")
            (or (is-eq tag "api")
              (or (is-eq tag "app")
                (or (is-eq tag "login")
                  (or (is-eq tag "signup")
                    (or (is-eq tag "settings")
                      (or (is-eq tag "help")
                        (or (is-eq tag "faq")
                          (or (is-eq tag "terms")
                            (or (is-eq tag "privacy")
                              (is-eq tag "leaderboard")
                            )
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Register Miner Tag (buy referral code)
;; ---------------------------------------------------------

(define-public (register-miner-tag
    (tag (string-ascii 24))
    (token <sip-010-trait>)
  )
  (let
    (
      (caller tx-sender)
      (tag-len (len tag))
      (fee (var-get referral-fee))
    )
    ;; Update round status based on current block height
    (check-and-update-round-status)
    ;; Validate token
    (asserts! (check-token (contract-of token)) ERR-INVALID-TOKEN)
    ;; Validate tag length
    (asserts! (>= tag-len u3) ERR-MINER-TAG-TOO-SHORT)
    (asserts! (<= tag-len u24) ERR-MINER-TAG-TOO-LONG)
    ;; Caller must not already have a tag
    (asserts! (is-none (map-get? principal-to-tag caller)) ERR-ALREADY-REGISTERED)
    ;; Tag must not be taken
    (asserts! (is-none (map-get? tag-to-principal tag)) ERR-MINER-TAG-TAKEN)
    ;; Tag must not be a reserved route
    (asserts! (not (is-reserved-tag tag)) ERR-RESERVED-TAG)

    ;; Pay registration fee into vault (dev can withdraw via dev-withdraw)
    (try! (vault-deposit token caller fee))
    (var-set dev-pool (+ (var-get dev-pool) fee))

    ;; Set bidirectional maps
    (map-set tag-to-principal tag caller)
    (map-set principal-to-tag caller tag)

    (ok tag)
  )
)

;; ---------------------------------------------------------
;; Public: Register Miner Tag with USDCx
;; ---------------------------------------------------------

(define-public (register-miner-tag-usdcx
    (tag (string-ascii 24))
    (token <sip-010-trait>)
    (price-feed-bytes (buff 8192))
  )
  (let
    (
      (caller tx-sender)
      (tag-len (len tag))
      (fee-sats (var-get referral-fee))
    )
    ;; Update round status
    (check-and-update-round-status)
    ;; Validate token is USDCx
    (asserts! (check-token-usdcx (contract-of token)) ERR-INVALID-TOKEN)
    ;; Validate tag
    (asserts! (>= tag-len u3) ERR-MINER-TAG-TOO-SHORT)
    (asserts! (<= tag-len u24) ERR-MINER-TAG-TOO-LONG)
    (asserts! (is-none (map-get? principal-to-tag caller)) ERR-ALREADY-REGISTERED)
    (asserts! (is-none (map-get? tag-to-principal tag)) ERR-MINER-TAG-TAKEN)
    (asserts! (not (is-reserved-tag tag)) ERR-RESERVED-TAG)

    ;; Get BTC/USD price from oracle
    (let
      (
        (price-info (try! (update-and-get-btc-price price-feed-bytes)))
        (btc-price (get price price-info))
        (abs-expo (get expo price-info))
        ;; Convert fee from sats to USDCx
        (fee-usdcx (sats-to-usdcx fee-sats btc-price abs-expo))
      )
      ;; Pay registration fee in USDCx
      (try! (vault-deposit token caller fee-usdcx))
      (var-set dev-pool-usdcx (+ (var-get dev-pool-usdcx) fee-usdcx))

      ;; Set bidirectional maps
      (map-set tag-to-principal tag caller)
      (map-set principal-to-tag caller tag)

      (ok tag)
    )
  )
)

;; ---------------------------------------------------------
;; Private: Settle unclaimed mining reward from previous round
;; ---------------------------------------------------------
;; When a miner interacts in a new round, check if they participated in
;; a previous round where the mining reward went unclaimed. If so,
;; credit their proportional share to miner-unclaimed-sbtc/usdcx maps.

(define-private (settle-previous-round (caller principal) (cur-round uint))
  (let
    (
      (last-round (default-to u0 (map-get? miner-last-round caller)))
    )
    (if (and (> last-round u0) (< last-round cur-round))
      (let
        (
          (prev-state (map-get? miner-state { miner: caller, round: last-round }))
          (unclaimed-sbtc (default-to u0 (map-get? round-unclaimed-reward last-round)))
          (unclaimed-usdcx-val (default-to u0 (map-get? round-unclaimed-reward-usdcx last-round)))
          (prev-total (default-to u0 (map-get? round-total-hashes last-round)))
        )
        (match prev-state state
          (let
            (
              (user-hashes (get hashes state))
              (share-sbtc (if (and (> unclaimed-sbtc u0) (> prev-total u0))
                (/ (* unclaimed-sbtc user-hashes) prev-total)
                u0))
              (share-usdcx (if (and (> unclaimed-usdcx-val u0) (> prev-total u0))
                (/ (* unclaimed-usdcx-val user-hashes) prev-total)
                u0))
            )
            ;; Log settlement
            (print {
              event: "unclaimed-reward-settled",
              miner: caller,
              from-round: last-round,
              to-round: cur-round,
              sbtc-share: share-sbtc,
              usdcx-share: share-usdcx,
              round-unclaimed-sbtc: unclaimed-sbtc,
              round-unclaimed-usdcx: unclaimed-usdcx-val
            })
            ;; Credit unclaimed sBTC balance
            (if (> share-sbtc u0)
              (map-set miner-unclaimed-sbtc caller
                (+ (default-to u0 (map-get? miner-unclaimed-sbtc caller)) share-sbtc))
              false
            )
            ;; Credit unclaimed USDCx balance
            (if (> share-usdcx u0)
              (map-set miner-unclaimed-usdcx caller
                (+ (default-to u0 (map-get? miner-unclaimed-usdcx caller)) share-usdcx))
              false
            )
            ;; Update last round
            (map-set miner-last-round caller cur-round)
            true
          )
          ;; No previous state found
          (begin
            (map-set miner-last-round caller cur-round)
            false
          )
        )
      )
      ;; Same round or first interaction
      (begin
        (map-set miner-last-round caller cur-round)
        false
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Buy Hashes (exact hashes in, computed sBTC cost)
;; ---------------------------------------------------------

(define-public (buy-hashes (hash-amount uint) (rig uint) (max-sbtc uint) (referrer-tag (optional (string-ascii 24))) (token <sip-010-trait>))
  (let
    (
      (caller tx-sender)
    )
    ;; Update round status based on current block height
    (check-and-update-round-status)

    (let
      (
        (round (var-get current-round))
        (supply (var-get total-hashes))
        (cost (get-cost-for-hashes supply hash-amount))
        (existing (map-get? miner-state { miner: caller, round: round }))
        ;; Set referrer on first buy if provided and not already set
        (referrer-set (if (is-none (map-get? miner-referrer caller))
          (match referrer-tag ref-tag
            (match (map-get? tag-to-principal ref-tag) referrer-principal
              (if (not (is-eq referrer-principal caller))
                (map-insert miner-referrer caller referrer-principal)
                false
              )
              false
            )
            false
          )
          false
        ))
        (has-referrer (is-some (map-get? miner-referrer caller)))
        (blocks-left (compute-blocks-remaining))
      )
      ;; Settle unclaimed mining reward from previous rounds
      (settle-previous-round caller round)
      ;; Validate token
      (asserts! (check-token (contract-of token)) ERR-INVALID-TOKEN)
      ;; Must be ONGOING (after auto-check)
      (asserts! (is-eq (var-get game-state) STATE-ONGOING) ERR-GAME-NOT-ONGOING)
      ;; Must have blocks remaining in this round
      (asserts! (> blocks-left u0) ERR-ROUND-ENDED)
      (asserts! (> hash-amount u0) ERR-ZERO-HASHES)
      (asserts! (or (is-eq rig RIG-CPU) (or (is-eq rig RIG-GPU) (or (is-eq rig RIG-FPGA) (is-eq rig RIG-ASIC)))) ERR-INVALID-RIG)
      ;; Slippage protection
      (asserts! (<= cost max-sbtc) ERR-INSUFFICIENT-PAYMENT)

      ;; Transfer sBTC into contract vault
      (try! (vault-deposit token caller cost))

      ;; Update total hashes (before mask calc)
      (var-set total-hashes (+ supply hash-amount))

      ;; Track hashes purchased at this Bitcoin block height
      (track-block-hashes round hash-amount)

      ;; Process hash carry: buying hashes can extend the round
      (process-hash-carry hash-amount)

      ;; Distribute payment across pools
      (let
        (
          (dist (distribute-payment cost rig has-referrer))
          (to-shares (get to-shares dist))
          (to-referrer-amount (get to-referrer dist))
          (new-total (var-get total-hashes))
          ;; Mask delta: (to-shares * PRECISION) / new-total
          (mask-delta (if (> new-total u0) (/ (* to-shares PRECISION) new-total) u0))
          (new-global-mask (+ (var-get global-mask) mask-delta))
          (is-new (is-none existing))
          (prev-hashes (match existing state (get hashes state) u0))
          (prev-mask (match existing state (get mask state) u0))
          (prev-pending (match existing state (get pending state) u0))
          ;; Settle: if existing user, calculate reward earned so far and add to pending
          (settled-pending (if is-new
            u0
            (+ prev-pending
              (if (> new-global-mask prev-mask)
                (/ (* prev-hashes (- new-global-mask prev-mask)) PRECISION)
                u0
              )
            )
          ))
        )

        ;; Update global mask
        (var-set global-mask new-global-mask)

        ;; Update rig counter
        (increment-rig-counter rig hash-amount)

        ;; Send referrer earnings directly and track in referral-earnings map
        (if (and has-referrer (> to-referrer-amount u0))
          (match (map-get? miner-referrer caller) referrer
            (begin
              (try! (vault-withdraw token referrer to-referrer-amount))
              (map-set referral-earnings referrer
                (+ (default-to u0 (map-get? referral-earnings referrer)) to-referrer-amount)
              )
              true
            )
            false
          )
          false
        )

        ;; Update miner state
        ;; New miners: snapshot current mask, pending = 0
        ;; Existing miners: settle pending reward, reset mask to current
        (map-set miner-state { miner: caller, round: round }
          {
            hashes: (+ prev-hashes hash-amount),
            rig: rig,
            mask: new-global-mask,
            pending: settled-pending
          }
        )

        ;; Increment unique miners if new
        (if is-new
          (var-set unique-miners (+ (var-get unique-miners) u1))
          false
        )

        ;; Update last miner (winner candidate)
        (var-set last-miner (some caller))

        (ok { cost: cost, hashes: hash-amount, new-supply: new-total, block-height: burn-block-height, blocks-remaining: blocks-left })
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Buy Hashes with USDCx (oracle-priced)
;; ---------------------------------------------------------

(define-public (buy-hashes-usdcx
    (hash-amount uint)
    (rig uint)
    (max-usdcx uint)
    (referrer-tag (optional (string-ascii 24)))
    (token <sip-010-trait>)
    (price-feed-bytes (buff 8192))
  )
  (let
    (
      (caller tx-sender)
    )
    ;; Update round status
    (check-and-update-round-status)

    (let
      (
        (round (var-get current-round))
        (supply (var-get total-hashes))
        (cost-sats (get-cost-for-hashes supply hash-amount))
        ;; Get BTC/USD price from oracle
        (price-info (try! (update-and-get-btc-price price-feed-bytes)))
        (btc-price (get price price-info))
        (abs-expo (get expo price-info))
        ;; Convert cost from sats to USDCx
        (cost-usdcx (sats-to-usdcx cost-sats btc-price abs-expo))
        (existing (map-get? miner-state { miner: caller, round: round }))
        ;; Set referrer on first buy if provided and not already set
        (referrer-set (if (is-none (map-get? miner-referrer caller))
          (match referrer-tag ref-tag
            (match (map-get? tag-to-principal ref-tag) referrer-principal
              (if (not (is-eq referrer-principal caller))
                (map-insert miner-referrer caller referrer-principal)
                false
              )
              false
            )
            false
          )
          false
        ))
        (has-referrer (is-some (map-get? miner-referrer caller)))
        (blocks-left (compute-blocks-remaining))
      )
      ;; Settle unclaimed mining reward from previous rounds
      (settle-previous-round caller round)
      ;; Validate token is USDCx
      (asserts! (check-token-usdcx (contract-of token)) ERR-INVALID-TOKEN)
      ;; Must be ONGOING
      (asserts! (is-eq (var-get game-state) STATE-ONGOING) ERR-GAME-NOT-ONGOING)
      (asserts! (> blocks-left u0) ERR-ROUND-ENDED)
      (asserts! (> hash-amount u0) ERR-ZERO-HASHES)
      (asserts! (or (is-eq rig RIG-CPU) (or (is-eq rig RIG-GPU) (or (is-eq rig RIG-FPGA) (is-eq rig RIG-ASIC)))) ERR-INVALID-RIG)
      ;; Slippage protection (in USDCx)
      (asserts! (<= cost-usdcx max-usdcx) ERR-INSUFFICIENT-PAYMENT)

      ;; Transfer USDCx into contract vault
      (try! (vault-deposit token caller cost-usdcx))

      ;; Update total hashes (before mask calc)
      (var-set total-hashes (+ supply hash-amount))

      ;; Track hashes purchased at this block height
      (track-block-hashes round hash-amount)

      ;; Process hash carry
      (process-hash-carry hash-amount)

      ;; Distribute payment across USDCx pools (mask accounting uses sat-equivalent)
      (let
        (
          (dist (distribute-payment-usdcx cost-usdcx cost-sats rig has-referrer))
          (to-shares-sats (get to-shares-sats dist))
          (to-referrer-usdcx (get to-referrer-usdcx dist))
          (new-total (var-get total-hashes))
          ;; Mask delta uses sat-equivalent shares
          (mask-delta (if (> new-total u0) (/ (* to-shares-sats PRECISION) new-total) u0))
          (new-global-mask (+ (var-get global-mask) mask-delta))
          (is-new (is-none existing))
          (prev-hashes (match existing state (get hashes state) u0))
          (prev-mask (match existing state (get mask state) u0))
          (prev-pending (match existing state (get pending state) u0))
          (settled-pending (if is-new
            u0
            (+ prev-pending
              (if (> new-global-mask prev-mask)
                (/ (* prev-hashes (- new-global-mask prev-mask)) PRECISION)
                u0
              )
            )
          ))
        )

        ;; Update global mask
        (var-set global-mask new-global-mask)

        ;; Update rig counter
        (increment-rig-counter rig hash-amount)

        ;; Send referrer earnings in USDCx
        (if (and has-referrer (> to-referrer-usdcx u0))
          (match (map-get? miner-referrer caller) referrer
            (begin
              (try! (vault-withdraw token referrer to-referrer-usdcx))
              (map-set referral-earnings-usdcx referrer
                (+ (default-to u0 (map-get? referral-earnings-usdcx referrer))
                   to-referrer-usdcx)
              )
              true
            )
            false
          )
          false
        )

        ;; Update miner state (all in sat-equivalent)
        (map-set miner-state { miner: caller, round: round }
          {
            hashes: (+ prev-hashes hash-amount),
            rig: rig,
            mask: new-global-mask,
            pending: settled-pending
          }
        )

        ;; Increment unique miners if new
        (if is-new
          (var-set unique-miners (+ (var-get unique-miners) u1))
          false
        )

        ;; Update last miner (winner candidate)
        (var-set last-miner (some caller))

        (ok { cost-usdcx: cost-usdcx, cost-sats: cost-sats, hashes: hash-amount, new-supply: new-total, block-height: burn-block-height, blocks-remaining: blocks-left })
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Claim Mining Reward (withdraw proportional reward via mask)
;; ---------------------------------------------------------

(define-public (claim-mining-shares (token <sip-010-trait>))
  (claim-mining-shares-for-round (var-get current-round) token)
)

;; Claim mining shares for a specific round (allows cross-round claims)
(define-public (claim-mining-shares-for-round (round uint) (token <sip-010-trait>))
  (let
    (
      (caller tx-sender)
    )
    ;; Update round status based on current block height
    (check-and-update-round-status)

    (let
      (
        (cur-round (var-get current-round))
        (state (unwrap! (map-get? miner-state { miner: caller, round: round }) ERR-NO-REWARD))
        ;; For current round use live global-mask; for past rounds use the snapshot
        (g-mask (if (is-eq round cur-round)
          (var-get global-mask)
          (default-to u0 (map-get? round-final-mask round))
        ))
        (u-mask (get mask state))
        (hashes (get hashes state))
      )
      ;; Validate token
      (asserts! (check-token (contract-of token)) ERR-INVALID-TOKEN)
      ;; Round must be current or past
      (asserts! (<= round cur-round) ERR-INVALID-VALUE)

      (let
        (
          (settled (get pending state))
          (mask-reward (if (> g-mask u-mask)
            (/ (* hashes (- g-mask u-mask)) PRECISION)
            u0
          ))
          (reward (+ settled mask-reward))
          (is-current (is-eq round cur-round))
          ;; Only cap against pool balance for current round; past rounds withdraw directly
          (pool-balance (var-get mining-shares-pool))
          (actual-payout (if is-current
            (if (> reward pool-balance) pool-balance reward)
            reward))
          (remaining (if is-current (- reward actual-payout) u0))
        )
        (asserts! (> reward u0) ERR-NO-REWARD)
        (asserts! (> actual-payout u0) ERR-NO-REWARD)

        ;; Pay from vault
        (try! (vault-withdraw token caller actual-payout))
        ;; Only deduct from pool for current round claims
        (if is-current
          (var-set mining-shares-pool (- pool-balance actual-payout))
          false
        )

        ;; Track shares paid (rolling windows + all-time)
        (record-shares-paid actual-payout)

        ;; Track total withdrawn per user
        (map-set total-withdrawn caller
          (+ (default-to u0 (map-get? total-withdrawn caller)) actual-payout)
        )

        ;; Snapshot current mask; keep remainder as pending for dual claim (current round only)
        (map-set miner-state { miner: caller, round: round }
          (merge state { mask: g-mask, pending: remaining })
        )

        (ok actual-payout)
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Claim Mining Shares (dual-token pro-rata)
;; Pays proportionally from both sBTC and USDCx mining-shares pools.
;; ---------------------------------------------------------

(define-public (claim-mining-shares-dual
    (sbtc-token <sip-010-trait>)
    (usdcx-token <sip-010-trait>)
    (price-feed-bytes (buff 8192))
  )
  (let
    (
      (caller tx-sender)
    )
    ;; Update round status
    (check-and-update-round-status)

    (let
      (
        (round (var-get current-round))
        (state (unwrap! (map-get? miner-state { miner: caller, round: round }) ERR-NO-REWARD))
        (g-mask (var-get global-mask))
        (u-mask (get mask state))
        (hashes (get hashes state))
      )
      ;; Validate tokens
      (asserts! (check-token (contract-of sbtc-token)) ERR-INVALID-TOKEN)
      (asserts! (check-token-usdcx (contract-of usdcx-token)) ERR-INVALID-TOKEN)

      (let
        (
          (settled (get pending state))
          (mask-reward (if (> g-mask u-mask)
            (/ (* hashes (- g-mask u-mask)) PRECISION)
            u0
          ))
          (reward-sats (+ settled mask-reward))
        )
        (asserts! (> reward-sats u0) ERR-NO-REWARD)

        ;; Get oracle price for pro-rata conversion
        (let
          (
            (price-info (try! (update-and-get-btc-price price-feed-bytes)))
            (btc-price (get price price-info))
            (abs-expo (get expo price-info))
            ;; Pool balances
            (sbtc-pool (var-get mining-shares-pool))
            (usdcx-pool (var-get mining-shares-pool-usdcx))
            ;; Convert USDCx pool to sat-equivalent for ratio calculation
            (usdcx-pool-sats (usdcx-to-sats usdcx-pool btc-price abs-expo))
            (total-pool-sats (+ sbtc-pool usdcx-pool-sats))
          )
          (if (> total-pool-sats u0)
            (let
              (
                ;; Pro-rata: sBTC share of the reward (capped at pool balance)
                (sbtc-payout-raw (/ (* reward-sats sbtc-pool) total-pool-sats))
                (sbtc-payout (if (> sbtc-payout-raw sbtc-pool) sbtc-pool sbtc-payout-raw))
                ;; Remainder goes to USDCx (capped at pool balance)
                (usdcx-payout-sats (- reward-sats sbtc-payout))
                (usdcx-payout-raw (sats-to-usdcx usdcx-payout-sats btc-price abs-expo))
                (usdcx-payout (if (> usdcx-payout-raw usdcx-pool) usdcx-pool usdcx-payout-raw))
              )
              ;; Pay sBTC portion
              (if (> sbtc-payout u0)
                (begin
                  (try! (vault-withdraw sbtc-token caller sbtc-payout))
                  (var-set mining-shares-pool (- sbtc-pool sbtc-payout))
                )
                false
              )
              ;; Pay USDCx portion
              (if (> usdcx-payout u0)
                (begin
                  (try! (vault-withdraw usdcx-token caller usdcx-payout))
                  (var-set mining-shares-pool-usdcx (- usdcx-pool usdcx-payout))
                )
                false
              )

              ;; Track shares paid
              (record-shares-paid reward-sats)

              ;; Track total withdrawn
              (map-set total-withdrawn caller
                (+ (default-to u0 (map-get? total-withdrawn caller)) reward-sats)
              )

              ;; Update miner state
              (map-set miner-state { miner: caller, round: round }
                (merge state { mask: g-mask, pending: u0 })
              )

              (ok { sbtc-payout: sbtc-payout, usdcx-payout: usdcx-payout, total-sats: reward-sats })
            )
            ;; Pool is empty
            ERR-NO-REWARD
          )
        )
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Claim Mining Reward (winner only, during cooldown)
;; ---------------------------------------------------------

(define-public (claim-mining-reward (token <sip-010-trait>))
  (let
    (
      (caller tx-sender)
    )
    ;; Update round status based on current block height
    (check-and-update-round-status)

    (let
      (
        (winner (unwrap! (var-get last-miner) ERR-NOT-WINNER))
        (round (var-get current-round))
        (winner-state (unwrap! (map-get? miner-state { miner: winner, round: round }) ERR-NOT-WINNER))
        (rig (get rig winner-state))
        (reward-pool (var-get mining-reward-pool))
      )
      ;; Validate token
      (asserts! (check-token (contract-of token)) ERR-INVALID-TOKEN)
      ;; Only during cooldown
      (asserts! (is-eq (var-get game-state) STATE-COOLDOWN) ERR-GAME-NOT-COOLDOWN)
      ;; Only the winner
      (asserts! (is-eq caller winner) ERR-NOT-WINNER)
      (asserts! (> reward-pool u0) ERR-NO-REWARD)

      (let
        (
          ;; Winner gets 48%, dev gets 2%, remaining 50% split by rig type
          (winner-amount (/ (* reward-pool u4800) BASIS))
          (dev-amount (/ (* reward-pool u200) BASIS))
          (remaining (/ (* reward-pool u5000) BASIS))

          ;; Remaining split depends on winner's rig
          (rig-split (if (is-eq rig RIG-CPU)
            { next-round: u1000, shares: u2500, token-holders: u1500 }
            (if (is-eq rig RIG-GPU)
              { next-round: u1500, shares: u3000, token-holders: u500 }
              (if (is-eq rig RIG-FPGA)
                { next-round: u2000, shares: u2000, token-holders: u1000 }
                { next-round: u2000, shares: u2500, token-holders: u500 }
              )
            )
          ))

          (to-next (/ (* remaining (get next-round rig-split)) BASIS))
          (to-shares (/ (* remaining (get shares rig-split)) BASIS))
          (to-token-holders (/ (* remaining (get token-holders rig-split)) BASIS))
        )

        ;; Pay winner from vault
        (try! (vault-withdraw token caller winner-amount))

        ;; Update pools
        (var-set mining-reward-pool u0)
        (var-set dev-pool (+ (var-get dev-pool) dev-amount))
        (var-set next-round-pool (+ (var-get next-round-pool) to-next))
        (var-set token-holders-pool (+ (var-get token-holders-pool) to-token-holders))

        ;; Add remaining shares to mining-shares-pool and update global mask
        (var-set mining-shares-pool (+ (var-get mining-shares-pool) to-shares))
        (record-shares-earned to-shares)
        (let
          (
            (total (var-get total-hashes))
            (mask-delta (if (> total u0) (/ (* to-shares PRECISION) total) u0))
          )
          (var-set global-mask (+ (var-get global-mask) mask-delta))
        )

        (ok winner-amount)
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Claim Mining Reward (winner, dual-token pro-rata)
;; ---------------------------------------------------------

(define-public (claim-mining-reward-dual
    (sbtc-token <sip-010-trait>)
    (usdcx-token <sip-010-trait>)
    (price-feed-bytes (buff 8192))
  )
  (let
    (
      (caller tx-sender)
    )
    (check-and-update-round-status)

    (let
      (
        (winner (unwrap! (var-get last-miner) ERR-NOT-WINNER))
        (round (var-get current-round))
        (winner-state (unwrap! (map-get? miner-state { miner: winner, round: round }) ERR-NOT-WINNER))
        (rig (get rig winner-state))
        (reward-pool-sbtc (var-get mining-reward-pool))
        (reward-pool-usdcx (var-get mining-reward-pool-usdcx))
      )
      (asserts! (check-token (contract-of sbtc-token)) ERR-INVALID-TOKEN)
      (asserts! (check-token-usdcx (contract-of usdcx-token)) ERR-INVALID-TOKEN)
      (asserts! (is-eq (var-get game-state) STATE-COOLDOWN) ERR-GAME-NOT-COOLDOWN)
      (asserts! (is-eq caller winner) ERR-NOT-WINNER)
      (asserts! (or (> reward-pool-sbtc u0) (> reward-pool-usdcx u0)) ERR-NO-REWARD)

      (let
        (
          ;; Winner gets 48%, dev gets 2%, remaining 50% split by rig type
          ;; sBTC portion
          (winner-sbtc (/ (* reward-pool-sbtc u4800) BASIS))
          (dev-sbtc (/ (* reward-pool-sbtc u200) BASIS))
          (remaining-sbtc (/ (* reward-pool-sbtc u5000) BASIS))
          ;; USDCx portion
          (winner-usdcx (/ (* reward-pool-usdcx u4800) BASIS))
          (dev-usdcx (/ (* reward-pool-usdcx u200) BASIS))
          (remaining-usdcx (/ (* reward-pool-usdcx u5000) BASIS))

          (rig-split (if (is-eq rig RIG-CPU)
            { next-round: u1000, shares: u2500, token-holders: u1500 }
            (if (is-eq rig RIG-GPU)
              { next-round: u1500, shares: u3000, token-holders: u500 }
              (if (is-eq rig RIG-FPGA)
                { next-round: u2000, shares: u2000, token-holders: u1000 }
                { next-round: u2000, shares: u2500, token-holders: u500 }
              )
            )
          ))

          ;; sBTC splits
          (to-next-sbtc (/ (* remaining-sbtc (get next-round rig-split)) BASIS))
          (to-shares-sbtc (/ (* remaining-sbtc (get shares rig-split)) BASIS))
          (to-token-holders-sbtc (/ (* remaining-sbtc (get token-holders rig-split)) BASIS))
          ;; USDCx splits
          (to-next-usdcx (/ (* remaining-usdcx (get next-round rig-split)) BASIS))
          (to-shares-usdcx (/ (* remaining-usdcx (get shares rig-split)) BASIS))
          (to-token-holders-usdcx (/ (* remaining-usdcx (get token-holders rig-split)) BASIS))
        )

        ;; Pay winner sBTC
        (if (> winner-sbtc u0)
          (try! (vault-withdraw sbtc-token caller winner-sbtc))
          true
        )
        ;; Pay winner USDCx
        (if (> winner-usdcx u0)
          (try! (vault-withdraw usdcx-token caller winner-usdcx))
          true
        )

        ;; Update sBTC pools
        (var-set mining-reward-pool u0)
        (var-set dev-pool (+ (var-get dev-pool) dev-sbtc))
        (var-set next-round-pool (+ (var-get next-round-pool) to-next-sbtc))
        (var-set token-holders-pool (+ (var-get token-holders-pool) to-token-holders-sbtc))
        (var-set mining-shares-pool (+ (var-get mining-shares-pool) to-shares-sbtc))

        ;; Update USDCx pools
        (var-set mining-reward-pool-usdcx u0)
        (var-set dev-pool-usdcx (+ (var-get dev-pool-usdcx) dev-usdcx))
        (var-set next-round-pool-usdcx (+ (var-get next-round-pool-usdcx) to-next-usdcx))
        (var-set token-holders-pool-usdcx (+ (var-get token-holders-pool-usdcx) to-token-holders-usdcx))
        (var-set mining-shares-pool-usdcx (+ (var-get mining-shares-pool-usdcx) to-shares-usdcx))

        ;; Update global mask with sat-equivalent shares from both tokens
        (let
          (
            (price-info (try! (update-and-get-btc-price price-feed-bytes)))
            (btc-price (get price price-info))
            (abs-expo (get expo price-info))
            (to-shares-usdcx-sats (usdcx-to-sats to-shares-usdcx btc-price abs-expo))
            (total-shares-sats (+ to-shares-sbtc to-shares-usdcx-sats))
            (total (var-get total-hashes))
            (mask-delta (if (> total u0) (/ (* total-shares-sats PRECISION) total) u0))
          )
          (record-shares-earned total-shares-sats)
          (var-set global-mask (+ (var-get global-mask) mask-delta))
        )

        (ok { winner-sbtc: winner-sbtc, winner-usdcx: winner-usdcx })
      )
    )
  )
)

;; ---------------------------------------------------------
;; Public: Dev Withdraw USDCx
;; ---------------------------------------------------------

(define-public (dev-withdraw-usdcx (amount uint) (token <sip-010-trait>))
  (begin
    (check-and-update-round-status)
    (asserts! (check-token-usdcx (contract-of token)) ERR-INVALID-TOKEN)
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (<= amount (var-get dev-pool-usdcx)) ERR-INSUFFICIENT-PAYMENT)
    (try! (vault-withdraw token CONTRACT-OWNER amount))
    (var-set dev-pool-usdcx (- (var-get dev-pool-usdcx) amount))
    (ok amount)
  )
)

;; ---------------------------------------------------------
;; Public: Start New Round (after cooldown expires)
;; ---------------------------------------------------------

(define-public (start-new-round)
  (begin
    ;; Update round status based on current block height
    ;; This will auto-start the round if cooldown has expired
    (check-and-update-round-status)

    ;; If still in cooldown (cooldown hasn't expired yet), reject
    (asserts! (is-eq (var-get game-state) STATE-ONGOING) ERR-GAME-NOT-COOLDOWN)

    (ok (var-get current-round))
  )
)

;; ---------------------------------------------------------
;; Public: Dev Withdraw
;; ---------------------------------------------------------

(define-public (dev-withdraw (amount uint) (token <sip-010-trait>))
  (begin
    ;; Update round status based on current block height
    (check-and-update-round-status)
    (asserts! (check-token (contract-of token)) ERR-INVALID-TOKEN)
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (<= amount (var-get dev-pool)) ERR-INSUFFICIENT-PAYMENT)
    (try! (vault-withdraw token CONTRACT-OWNER amount))
    (var-set dev-pool (- (var-get dev-pool) amount))
    (ok amount)
  )
)

;; ---------------------------------------------------------
;; Read-only: Config getters
;; ---------------------------------------------------------

(define-read-only (get-sbtc-principal)
  (var-get sbtc)
)

(define-read-only (get-usdcx-principal)
  (var-get usdcx)
)

(define-read-only (get-referral-fee)
  (var-get referral-fee)
)

(define-read-only (get-blocks-per-round)
  (var-get blocks-per-round)
)

(define-read-only (get-cooldown-blocks)
  (var-get cooldown-blocks)
)

;; ---------------------------------------------------------
;; Read-only: Game state queries
;; ---------------------------------------------------------

(define-read-only (get-miner-tag (who principal))
  (map-get? principal-to-tag who)
)

(define-read-only (get-principal-by-tag (tag (string-ascii 24)))
  (map-get? tag-to-principal tag)
)

(define-read-only (get-miner-info (who principal) (round uint))
  (map-get? miner-state { miner: who, round: round })
)

(define-read-only (get-miner-referrer (who principal))
  (map-get? miner-referrer who)
)

(define-read-only (get-round-info)
  (let
    (
      (bpr (var-get blocks-per-round))
      (bonus (var-get block-overflow))
      (effective-duration (+ bpr bonus))
      (elapsed (- burn-block-height (var-get round-start-height)))
      (blocks-left (if (>= elapsed effective-duration) u0 (- effective-duration elapsed)))
      (cd-end (+ (var-get cooldown-start-height) (var-get cooldown-blocks)))
      (cd-remaining (if (and (is-eq (var-get game-state) STATE-COOLDOWN)
                              (< burn-block-height cd-end))
                      (- cd-end burn-block-height)
                      u0))
    )
    {
      round: (var-get current-round),
      state: (var-get game-state),
      blocks-remaining: blocks-left,
      blocks-elapsed: elapsed,
      block-overflow: bonus,
      round-start-height: (var-get round-start-height),
      current-block-height: burn-block-height,
      total-hashes: (var-get total-hashes),
      cpu-hashes: (var-get total-cpu-hashes),
      gpu-hashes: (var-get total-gpu-hashes),
      fpga-hashes: (var-get total-fpga-hashes),
      asic-hashes: (var-get total-asic-hashes),
      mining-reward: (var-get mining-reward-pool),
      mining-shares: (var-get mining-shares-pool),
      unique-miners: (var-get unique-miners),
      cooldown-blocks-remaining: cd-remaining,
      effective-duration: effective-duration
    }
  )
)

(define-read-only (get-all-pools)
  {
    mining-reward: (var-get mining-reward-pool),
    mining-shares: (var-get mining-shares-pool),
    token-holders: (var-get token-holders-pool),
    free-hunt: (var-get free-hunt-pool),
    next-round: (var-get next-round-pool),
    airdrop: (var-get airdrop-pool),
    dev: (var-get dev-pool)
  }
)

(define-read-only (get-all-pools-usdcx)
  {
    mining-reward: (var-get mining-reward-pool-usdcx),
    mining-shares: (var-get mining-shares-pool-usdcx),
    token-holders: (var-get token-holders-pool-usdcx),
    free-hunt: (var-get free-hunt-pool-usdcx),
    next-round: (var-get next-round-pool-usdcx),
    airdrop: (var-get airdrop-pool-usdcx),
    dev: (var-get dev-pool-usdcx)
  }
)

(define-read-only (get-global-mask)
  (var-get global-mask)
)

(define-read-only (get-shares-stats)
  {
    total-earned: (var-get total-shares-earned),
    total-paid: (var-get total-shares-paid),
    paid-last-hour: (+ (var-get hourly-paid-current) (var-get hourly-paid-previous)),
    paid-last-day: (+ (var-get daily-paid-current) (var-get daily-paid-previous))
  }
)

(define-read-only (get-pending-reward (who principal))
  (let
    (
      (round (var-get current-round))
      (state (map-get? miner-state { miner: who, round: round }))
    )
    (match state miner-data
      (let
        (
          (g-mask (var-get global-mask))
          (u-mask (get mask miner-data))
          (hashes (get hashes miner-data))
          (settled (get pending miner-data))
          (mask-reward (if (> g-mask u-mask)
            (/ (* hashes (- g-mask u-mask)) PRECISION)
            u0
          ))
        )
        (+ settled mask-reward)
      )
      u0
    )
  )
)

(define-read-only (get-referral-earnings (who principal))
  (default-to u0 (map-get? referral-earnings who))
)

(define-read-only (get-referral-earnings-usdcx (who principal))
  (default-to u0 (map-get? referral-earnings-usdcx who))
)

(define-read-only (get-total-withdrawn (who principal))
  (default-to u0 (map-get? total-withdrawn who))
)

;; Price for N hashes at current supply
(define-read-only (price-for-n-hashes (hash-amount uint))
  (get-cost-for-hashes (var-get total-hashes) hash-amount)
)

;; Get hashes purchased at a specific block height in a given round
(define-read-only (get-hashes-at-block (round uint) (blk uint))
  (default-to u0 (map-get? block-hashes { round: round, block-height: blk }))
)

;; Get blocks remaining in current round (includes bonus blocks from hash purchases)
(define-read-only (get-blocks-remaining)
  (let
    (
      (effective-duration (+ (var-get blocks-per-round) (var-get block-overflow)))
      (elapsed (- burn-block-height (var-get round-start-height)))
    )
    (if (>= elapsed effective-duration) u0 (- effective-duration elapsed))
  )
)

(define-read-only (get-round-start-height)
  (var-get round-start-height)
)

(define-read-only (get-last-miner)
  (var-get last-miner)
)

(define-public (get-vault-balance (token <sip-010-trait>))
  (begin
    (asserts! (check-token (contract-of token)) ERR-INVALID-TOKEN)
    (contract-call? token get-balance (as-contract tx-sender))
  )
)

;; ---------------------------------------------------------
;; Read-only: Unclaimed reward queries
;; ---------------------------------------------------------

(define-read-only (get-miner-unclaimed-sbtc (who principal))
  (default-to u0 (map-get? miner-unclaimed-sbtc who))
)

(define-read-only (get-miner-unclaimed-usdcx (who principal))
  (default-to u0 (map-get? miner-unclaimed-usdcx who))
)

(define-read-only (get-round-unclaimed (round uint))
  {
    sbtc: (default-to u0 (map-get? round-unclaimed-reward round)),
    usdcx: (default-to u0 (map-get? round-unclaimed-reward-usdcx round)),
    total-hashes: (default-to u0 (map-get? round-total-hashes round))
  }
)

(define-read-only (get-miner-last-round (who principal))
  (default-to u0 (map-get? miner-last-round who))
)

;; ---------------------------------------------------------
;; Public: Settle unclaimed reward from previous round
;; ---------------------------------------------------------
;; Allows miners to trigger settlement without buying hashes.
;; Useful for miners who stopped playing but have unclaimed reward shares.

(define-public (settle-my-unclaimed)
  (let
    (
      (caller tx-sender)
    )
    (check-and-update-round-status)
    (settle-previous-round caller (var-get current-round))
    (ok true)
  )
)

;; ---------------------------------------------------------
;; Public: Claim accumulated unclaimed reward balances
;; ---------------------------------------------------------

(define-public (claim-unclaimed-sbtc (token <sip-010-trait>))
  (let
    (
      (caller tx-sender)
      (amount (default-to u0 (map-get? miner-unclaimed-sbtc caller)))
    )
    (asserts! (check-token (contract-of token)) ERR-INVALID-TOKEN)
    (asserts! (> amount u0) ERR-NO-REWARD)
    (try! (vault-withdraw token caller amount))
    (map-set miner-unclaimed-sbtc caller u0)
    (map-set total-withdrawn caller
      (+ (default-to u0 (map-get? total-withdrawn caller)) amount))
    (ok amount)
  )
)

(define-public (claim-unclaimed-usdcx (token <sip-010-trait>))
  (let
    (
      (caller tx-sender)
      (amount (default-to u0 (map-get? miner-unclaimed-usdcx caller)))
    )
    (asserts! (check-token-usdcx (contract-of token)) ERR-INVALID-TOKEN)
    (asserts! (> amount u0) ERR-NO-REWARD)
    (try! (vault-withdraw token caller amount))
    (map-set miner-unclaimed-usdcx caller u0)
    (ok amount)
  )
)

;; ---------------------------------------------------------
;; Admin: Config setters (owner only, with data validation)
;; ---------------------------------------------------------

(define-public (set-sbtc (new-sbtc principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Validate: cannot set to the contract itself
    (asserts! (not (is-eq new-sbtc (as-contract tx-sender))) ERR-INVALID-VALUE)
    (ok (var-set sbtc new-sbtc))
  )
)

(define-public (set-usdcx (new-usdcx principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    (asserts! (not (is-eq new-usdcx (as-contract tx-sender))) ERR-INVALID-VALUE)
    (ok (var-set usdcx new-usdcx))
  )
)

(define-public (set-referral-fee (new-fee uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Validate: max 1 BTC (100_000_000 sats)
    (asserts! (<= new-fee u100000000) ERR-OVERFLOW)
    (ok (var-set referral-fee new-fee))
  )
)

(define-public (set-blocks-per-round (new-blocks uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Validate: minimum 1 block, maximum 10080 blocks (~70 days)
    (asserts! (>= new-blocks u1) ERR-INVALID-VALUE)
    (asserts! (<= new-blocks u10080) ERR-OVERFLOW)
    (ok (var-set blocks-per-round new-blocks))
  )
)

(define-public (set-cooldown-blocks (new-blocks uint))
  (begin
    (asserts! (is-eq tx-sender CONTRACT-OWNER) ERR-NOT-AUTHORIZED)
    ;; Validate: minimum 1 block, maximum 144 blocks (~1 day)
    (asserts! (>= new-blocks u1) ERR-INVALID-VALUE)
    (asserts! (<= new-blocks u144) ERR-OVERFLOW)
    (ok (var-set cooldown-blocks new-blocks))
  )
)
