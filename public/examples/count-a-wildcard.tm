# TM that counts the number of a's on the first tape and writes that 
# number of 0's on the second tape. It demonstrates the use of the ? 
# wildcard in specifying transition rules. Note that because they have 
# no wildcard symbols, the specific rules override the wildcard rule

states: [q, qA, qR]
input_alphabet: [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z]
tape_alphabet_extra: [0]
start_state: q
accept_state: qA
reject_state: qR

delta:
  q:
    ?_: [q, ?_, RS]    # Wildcard: copy any symbol to tape 1, stay/right
    a_: [q, a0, RR]    # Specific: for 'a', also write 0 on tape 2
    __: [qA, __, SS]   # End of input