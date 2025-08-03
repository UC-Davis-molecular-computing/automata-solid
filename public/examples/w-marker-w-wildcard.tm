# TM recognizing the language { w:w | w is a string in {0,1}* }
# Same algorithm as w-marker-w.tm but using wildcard transitions
# Demonstrates the use of the ? wildcard in specifying transition rules

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
    '?': [q2, '?', R]    # Wildcard: skip over any symbol
    ':': [q4, ':', R]    # Specific: found the separator
  q3:
    '?': [q3, '?', R]    # Wildcard: skip over any symbol
    ':': [q5, ':', R]    # Specific: found the separator
  q4:
    '0': [q6, x, L]      # Specific: match the marked symbol
    x: [q4, x, R]        # Skip over marks
  q5:
    '1': [q6, x, L]      # Specific: match the marked symbol
    x: [q5, x, R]        # Skip over marks
  q6:
    '?': [q6, '?', L]    # Wildcard: go back over any symbol
    ':': [q7, ':', L]    # Specific: found separator, go to left side
  q7:
    '?': [q7, '?', L]    # Wildcard: go back over any symbol
    x: [q1, x, R]        # Found our mark, start matching next pair
  q8:
    x: [q8, x, R]        # Skip over all marks
    _: [qA, _, R]        # End of string - accept
