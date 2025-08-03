# TM computing the function f(0^n) = 0^{2n}
# This version demonstrates automatic state inference from delta function

states: [q0, q1, q2, qD, qA, qR]
input_alphabet: ['0']
tape_alphabet_extra: ['!']
start_state: q0
accept_state: qA
reject_state: qR

delta:
  q0:
    0_: [q1, '0!', SR]
  q1:
    0_: [q2, '00', SR]
    __: [qD, __, SL]
  q2:
    0_: [q1, '00', RR]
  qD:
    _0: [qD, _0, SL]
    _!: [qA, _!, SR]