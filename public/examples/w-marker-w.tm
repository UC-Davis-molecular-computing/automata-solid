# TM recognizing the language { w:w | w is a string in {0,1}* }
# Example: accepts "010:010", "1:1", "::" but rejects "01:10", "0:01"

states: [q1, q2, q3, q4, q5, q6, q7, q8, qA, qR]
input_alphabet: ['0', '1', ':']
tape_alphabet_extra: [x]
start_state: q1
accept_state: qA
reject_state: qR

delta:
  q1:
    '0': [q2, x, R]
    '1': [q3, x, R]
    ':': [q8, ':', R]
  q2:
    '?': [q2, '?', R]
    ':': [q4, ':', R]
  q3:
    '?': [q3, '?', R]
    ':': [q5, ':', R]
  q4:
    '0': [q6, x, L]
    x: [q4, x, R]
  q5:
    '1': [q6, x, L]
    x: [q5, x, R]
  q6:
    '?': [q6, '?', L]
    ':': [q7, ':', L]
    x: [q6, x, L]
  q7:
    '?': [q7, '?', L]
    x: [q1, x, R]
  q8:
    x: [q8, x, R]
    _: [qA, _, R]