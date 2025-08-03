# TM computing the function f(1^n) = 1^{2n}

states: [q0, q1, q2, qD, qA, qR]
input_alphabet: [1]
tape_alphabet_extra: ['!']  # ! needs quotes as it's a YAML special character
start_state: q0
accept_state: qA
reject_state: qR

delta:
  q0:
    1_: [q1, '1!', SR]
  q1:
    1_: [q2, '11', SR]
    __: [qD, __, SL]
  q2:
    1_: [q1, '11', RR]
  qD:
    _1: [qD, '_1', SL]
    _!: [qA, '_!', SR]