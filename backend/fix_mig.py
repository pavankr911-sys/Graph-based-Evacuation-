import re

with open('backend/alembic/versions/a85237b5430e_add_graph_models.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the broken formatting
content = re.sub(r'^\s*\)\n', '', content, flags=re.MULTILINE)
content = content.replace("sa.PrimaryKeyConstraint('id')", "sa.PrimaryKeyConstraint('id')\n    )")

with open('backend/alembic/versions/a85237b5430e_add_graph_models.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")
