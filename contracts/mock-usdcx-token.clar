;; title: mock-usdcx-token
;; description: Mock USDCx (Circle USDC) SIP-010 token for simnet testing.
;;   6 decimal places (1 USDC = 1,000,000 micro-units).

(define-constant ERR-NOT-OWNER (err u4))

(define-fungible-token usdcx-token)

(define-constant token-decimals u6)
(define-data-var token-name (string-ascii 32) "USDCx")
(define-data-var token-symbol (string-ascii 10) "USDCx")
(define-data-var token-uri (optional (string-utf8 256)) none)

;; --- SIP-010 implementation ---

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) ERR-NOT-OWNER)
    (try! (ft-transfer? usdcx-token amount sender recipient))
    (match memo to-print (print to-print) 0x)
    (ok true)
  )
)

(define-read-only (get-name)
  (ok (var-get token-name))
)

(define-read-only (get-symbol)
  (ok (var-get token-symbol))
)

(define-read-only (get-decimals)
  (ok token-decimals)
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance usdcx-token who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply usdcx-token))
)

(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

;; --- Test helpers: mint tokens for testing ---

(define-public (mint (amount uint) (recipient principal))
  (ft-mint? usdcx-token amount recipient)
)
