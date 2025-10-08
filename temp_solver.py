from itertools import product

row_hints=[[6],[1,1],[1,1,1,1],[1,1,1,1],[1,1],[1,4,1],[1,1],[1,1,1,1],[1,1],[6]]
col_hints=[[6],[1,1],[1,1,1,1],[1,1,1,1],[1,1,1],[1,1,1],[1,1,1,1],[1,1,1,1],[1,1],[6]]

n=len(row_hints)


def fits(line, hints):
    blocks=[]
    count=0
    for cell in line:
        if cell:
            count+=1
        else:
            if count:
                blocks.append(count)
                count=0
    if count:
        blocks.append(count)
    if not blocks:
        blocks=[0]
    return blocks==hints

row_options=[]
for hints in row_hints:
    opts=[]
    for mask in product([0,1], repeat=n):
        if fits(mask,hints):
            opts.append(mask)
    row_options.append(opts)

solutions=[]
for rows in product(*row_options):
    valid=True
    for col_idx, hints in enumerate(col_hints):
        column=[rows[r][col_idx] for r in range(n)]
        if not fits(column, hints):
            valid=False
            break
    if valid:
        solutions.append(rows)

print('solutions', len(solutions))
if solutions:
    for r in solutions[0]:
        print(''.join('#' if c else '.' for c in r))
