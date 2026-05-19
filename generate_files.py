"""Script to generate all remaining project files."""
import os

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Written: {path}")

# Run all generators
if __name__ == '__main__':
    gen_analytics2()
    gen_tool_registry()
    gen_agent()
    gen_main()
    gen_frontend()
    print("All files generated!")
