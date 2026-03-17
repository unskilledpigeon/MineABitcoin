;; title: mock-pyth-oracle
;; description: Mock Pyth oracle for simnet testing. Matches the interface
;;   that MineABitcoin.clar expects for verify-and-update + read-price-feed.

;; Configurable mock price state
(define-data-var mock-price int 8350000)      ;; e.g. 8350000 with expo=-2 = $83,500.00
(define-data-var mock-expo int -2)
(define-data-var mock-conf uint u50000)
(define-data-var mock-publish-time uint u1000000)

;; ---------------------------------------------------------
;; Public: verify-and-update-price-feeds (no-op in mock)
;; In production, this takes a VAA and verifies it via Wormhole.
;; In the mock, we just accept any buff and return ok.
;; ---------------------------------------------------------
(define-constant ERR-MOCK (err u9999))

(define-public (verify-and-update-price-feeds
    (price-feed-bytes (buff 8192))
  )
  (if true (ok u0) ERR-MOCK)
)

;; ---------------------------------------------------------
;; Read-only: read-price-feed
;; Returns the mock price data for any feed ID.
;; ---------------------------------------------------------
(define-public (read-price-feed (feed-id (buff 32)))
  (if true
    (ok {
      price: (var-get mock-price),
      conf: (var-get mock-conf),
      expo: (var-get mock-expo),
      ema-price: (var-get mock-price),
      ema-conf: (var-get mock-conf),
      publish-time: (var-get mock-publish-time),
      prev-publish-time: (- (var-get mock-publish-time) u60)
    })
    ERR-MOCK
  )
)

;; ---------------------------------------------------------
;; Admin: set mock price for testing
;; ---------------------------------------------------------
(define-public (set-mock-price (price int) (expo int))
  (begin
    (var-set mock-price price)
    (ok (var-set mock-expo expo))
  )
)

(define-public (set-mock-publish-time (t uint))
  (ok (var-set mock-publish-time t))
)
