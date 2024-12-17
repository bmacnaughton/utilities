
## get how many measurements for each "patcher" prefix entry

```bash
jq '. |= select(.prefix == "patcher") | select(. != null) .measurements | length' < agent-perf.jsonl
```

## get only these elements of the "patcher" "measurements"

```bash
jq '. |= select(.prefix == "patcher") | select(. != null).measurements[] | select(.tag == "patcher:String.prototype.substr:wrapper")' < agent-perf.jsonl
```
