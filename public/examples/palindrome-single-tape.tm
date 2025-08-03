# TM deciding { w in {0,1}* | w = w^R } (palindromes)

states: [s, r00, r11, r01, r10, l, lx, qA, qR]
input_alphabet: [0, 1]
tape_alphabet_extra: [x]
start_state: s
accept_state: qA
reject_state: qR

delta:
  s:
    0: [r00, x, R]
    1: [r11, x, R]
    x: [qA, x, S]    # empty string is palindrome
  r00:
    0: [r00, 0, R]
    1: [r01, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  r01:
    0: [r00, 0, R]
    1: [r01, 1, R]
  r10:
    0: [r10, 0, R]
    1: [r11, 1, R]
  r11:
    0: [r10, 0, R]
    1: [r11, 1, R]
    _: [lx, _, L]
    x: [lx, x, L]
  lx:
    0: [l, x, L]
    1: [l, x, L]
    x: [qA, x, S]    # all matched
  l:
    0: [l, 0, L]
    1: [l, 1, L]
    x: [s, x, R]