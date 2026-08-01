import json

with open(r'C:\Users\Chandrashekhar\.gemini\antigravity-ide\brain\e0bb1f6d-76c7-44ae-aba5-818fe0d58c2a\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if 'tool_calls' in data:
                for tc in data['tool_calls']:
                    if tc['name'] in ('replace_file_content', 'multi_replace_file_content'):
                        args = tc.get('args', {})
                        target = args.get('TargetFile', '')
                        if 'dashboard.component.html' in target:
                            step = data.get('step_index')
                            if step in (88, 106, 127, 133, 139, 145, 151, 160, 169):
                                print(f"--- Step {step} ---")
                                if tc['name'] == 'replace_file_content':
                                    print("Target:")
                                    print(args.get('TargetContent', ''))
                                    print("Replacement:")
                                    print(args.get('ReplacementContent', ''))
                                else:
                                    for i, chunk in enumerate(args.get('ReplacementChunks', [])):
                                        print(f"Chunk {i} Target:")
                                        print(chunk.get('TargetContent', ''))
                                        print(f"Chunk {i} Replacement:")
                                        print(chunk.get('ReplacementContent', ''))
        except Exception as e:
            pass
