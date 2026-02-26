import sys

content = open('static/js/script.js', encoding='utf-8').read()
stack = []

for i, char in enumerate(content):
    if char in '({[':
        stack.append((char, i))
    elif char in ')}]':
        if not stack:
            print(f"Unmatched {char} at index {i}")
        else:
            top = stack[-1][0]
            if (top == '{' and char == '}') or \
               (top == '(' and char == ')') or \
               (top == '[' and char == ']'):
                stack.pop()
            else:
                print(f"Mismatched closing {char} at index {i}")

if stack:
    for char, i in stack:
        lines = content[:i].count('\n') + 1
        print(f"Unclosed {char} at index {i} (line {lines})")
