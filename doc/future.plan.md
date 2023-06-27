#  Future Plan
---

1. rewrite expire-time logic
   
- initated not by user, with a fixed value (e.g. 30 minutes)
- once exceeding the expire-time, set the tx state to 3 (need not revert)
- automatic expire just before calling token transfer (set the expire-time to current blocktime)

2. more covered testing