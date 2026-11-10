# Which review signals can the game read from GitLab?

Research for issue #3. Date of reading: 2026-11-10.

## How we did this

- We read the official GitLab docs and the `glab` CLI docs only.
- We did not call any GitLab server.
- We did not test any request. Every fact below comes from the docs text.
- Each claim has a source number like `[3]`. The list is at the end.
- "Inference" marks a conclusion that the docs do not state directly.

Words used here:

- **MR**: merge request.
- **REST API**: the HTTP API with one URL per resource.
- **GraphQL API**: the API where one query asks for many linked fields.
- **Endpoint**: one URL of the REST API.
- **Token scope**: the list of rights that a token has.
- **Rate limit**: the highest number of requests in a time period.
- **Polling**: the client asks the server again and again for new data.
- **Self-managed**: a GitLab server that a team runs itself.

## Short answer

All seven signals exist. One user can read them with a personal token.

No single source gives all of them. The game needs three sources:

1. The Events API, for "I commented", "I approved" and "it merged".
2. The MR list and MR detail data, for the queue, the diff size and the merge.
3. The discussions of each MR, for resolved threads.

A client can compute the game state with no server. The limits are in the section "Can a client work with no server?".

## The signals

| Signal | Available? | Best source | Main limit |
|---|---|---|---|
| An MR waits for my review | Yes | REST `GET /merge_requests?scope=reviews_for_me&state=opened` [1]. GraphQL `currentUser.reviewRequestedMergeRequests` [2]. | Shows the queue now. It is not a history. |
| I commented on an MR | Yes | REST `GET /events?action=commented` [3][4]. Or the notes of each MR [5]. | Events live 3 years [4][11]. |
| I approved an MR | Yes | REST `GET /projects/:id/merge_requests/:iid/approvals`, field `approved_at` [6]. Or `GET /events?action=approved` [3][4]. | A removed approval leaves no record in these sources. |
| The author resolved my thread | Yes | REST `GET /projects/:id/merge_requests/:iid/discussions`, fields `resolved`, `resolved_by`, `resolved_at` [7]. | One request per MR. Shows the state now only. |
| The MR merged after my review | Yes | MR field `merged_at` [1]. Compare it with my approval or comment time. | Needs two facts from two sources. |
| Time from request to my first review | Partly | Start: to-do item `review_requested`, field `created_at` [8][9]. End: my first note or my `approved_at` [5][6]. | The start time is the weak part. See below. |
| Diff size of the MR | Yes | GraphQL `diffStatsSummary`: `additions`, `deletions`, `changes`, `fileCount` [2]. | REST gives only `changes_count`, a file count with a cap [1]. |

## Details for each signal

### 1. An MR waits for my review

- REST: `GET /merge_requests` has `scope=reviews_for_me`. It returns MRs where the current user is a reviewer [1].
- REST: the filters `reviewer_id` and `reviewer_username` do the same for any user [1].
- GraphQL: `currentUser.reviewRequestedMergeRequests` returns "Merge requests assigned to the user for review" [2].
- That GraphQL field has the filters `reviewState` and `reviewStates` [2].
- The review states are `UNREVIEWED`, `REVIEW_STARTED`, `REVIEWED`, `REQUESTED_CHANGES`, `APPROVED` and `UNAPPROVED` [10].
- So GraphQL can ask for "MRs where my review did not start yet".
- REST: `GET /projects/:id/merge_requests/:iid/reviewers` gives each reviewer with `state` and `created_at` [1].
- CLI: `glab mr list --reviewer=@me` lists the same queue. It has `--output json` [12].
- Limit: these calls show the state now. A removed reviewer disappears from the list.
- Limit: the REST docs show no filter for review state [1]. GraphQL has it.

### 2. I commented on an MR

- "commented" is a contribution event (an action that GitLab records for a user) [4].
- REST: `GET /events` lists the events of the current user [3].
- It has the filters `action`, `target_type`, `before`, `after` and `sort` [3].
- Each event has `created_at`, `project_id`, `target_type` and a `note` object [3].
- The other way: read the notes of one MR and keep those with my `author` [5].
- REST notes: `GET /projects/:id/merge_requests/:iid/notes` [5].
- GraphQL: `MergeRequest.notes` and `MergeRequest.discussions`, with `author`, `createdAt` and `system` [2].
- Limit: GitLab removes user events older than 3 years [4][11].
- Limit: the docs say the `DiscussionNote` target type is "not supported by the API" [3]. Some thread comments use that type. We could not confirm the exact effect.
- Limit: one MR can hold at most 5,000 comments [11]. This is not a real problem.

### 3. I approved an MR

- REST: `GET /projects/:id/merge_requests/:iid/approvals` works on all tiers, also Free [6].
- It returns `approved_by`. Each entry has the `user` and an `approved_at` time [6].
- GraphQL: `MergeRequest.approvedBy` lists the users who approved [2].
- GraphQL: `mergeRequestInteraction` has `approved`, `approvedAt`, `reviewed` and `reviewState` for one user [2].
- Events: "approved" is a contribution event for MRs [4]. Use `GET /events?action=approved`.
- REST: `GET /merge_requests?approved_by_usernames[]=<me>` lists MRs that I approved [1].
- Limit: `GET .../approval_state` (approval rules) needs the Premium or Ultimate tier [6]. The game does not need it.
- Limit: the event list has no "approval removed" event [4]. A removed approval is only visible as a missing entry.

### 4. The author resolved a thread that I started

- REST: `GET /projects/:id/merge_requests/:iid/discussions` returns each thread with its notes [7].
- Each note has `author`, `created_at`, `resolvable`, `resolved`, `resolved_by` and `resolved_at` [7].
- GraphQL: `Discussion` has `resolved`, `resolvedBy`, `resolvedAt`, `createdAt` and `notes` [2].
- The rule for the game: the first note is mine, and `resolved_by` is the MR author.
- Limit: "resolved" is not a contribution event [4]. The Events API cannot show it.
- Limit: so the client must read the discussions of each MR again. That costs one request per MR, or more.
- Limit: the data shows the state now. A thread that someone opens again loses its resolved fields. This last point is an inference.
- Limit: the REST list returns 20 threads per page by default [7].

### 5. The MR merged after my review

- REST: each MR has `merged_at` and `merge_user` [1].
- REST: `GET /merge_requests` has the filters `state=merged`, `merged_after` and `updated_after` [1].
- GraphQL: `MergeRequest.mergedAt` and `mergeUser`, and the filter `mergedAfter` [2].
- "merged" is a contribution event too, but only for the person who merged [4]. The last part is an inference.
- The rule for the game: `merged_at` is later than my first comment or my `approved_at`.
- A cheap query: `state=merged` with `approved_by_usernames[]=<me>` and `merged_after=<last sync>` [1].
- Limit: that query misses MRs where I commented but did not approve.
- Limit: `scope=reviews_for_me` with `state=merged` covers those. It needs me to stay a reviewer.

### 6. Time from review request to my first review

The end of the period is easy. The start is the hard part.

End of the period ("my first review"):

- My earliest note on the MR, from the notes or the discussions [5][7].
- Or my `approved_at`, if I approved with no comment [6].
- GraphQL also gives `reviewState` and `reviewed` for me [2].

Start of the period ("review requested"). There are three sources. None is perfect:

- **To-do items.** A review request creates one to-do item for each reviewer [9].
  The REST to-do list has the action `review_requested` and the field `created_at` [8].
  GraphQL has the same in `currentUser.todos` [2][10].
  A new request closes the old item and creates a new one [9]. So a repeated request gives a new start time.
  Limit: the docs give no storage period for to-do items [8][9].
  Limit: GitLab deletes the items when the user loses access to the MR [9].
- **Reviewers endpoint.** `GET .../merge_requests/:iid/reviewers` returns `created_at` for each reviewer [1].
  The docs do not explain that field. We infer it is the time of the request.
  We do not know if a repeated request changes it.
- **System notes** (notes that GitLab writes itself, for example "requested review from"). The notes API can return system notes [5].
  The docs do not list the exact texts. We could not confirm this source.

Other limits:

- "Review requested" is not a contribution event [4]. The Events API cannot give the start.
- GraphQL `mergeRequestInteraction.updatedAt` exists only for changes since version 19.2 [2].
- A reviewer can save comments as "pending" and publish them later [13]. The docs do not say which time the note then carries.
- A simple fallback: the client records the first time it sees the MR in the queue. This is exact only while the game runs.

### 7. Diff size of the MR

- GraphQL: `MergeRequest.diffStatsSummary` has `additions`, `deletions`, `changes` and `fileCount` [2].
- GraphQL: `MergeRequest.diffStats` gives the same numbers per file [2].
- REST: the single-MR response has `changes_count` [1].
- `changes_count` is a string. It fills in later, not at once. Its cap is `"1000+"` [1].
- We infer that `changes_count` counts changed files, not lines. The docs do not say it clearly.
- REST: `GET .../merge_requests/:iid/diffs` returns the diff text per file, with pages [1]. It gives no line counts.
- The diff endpoints follow the MR diff limits. Very large MRs return limited results [1][11].
- Conclusion: use GraphQL for the diff size. With REST only, the client must count lines itself.

## Limits

### Token scopes

- GraphQL queries need the `read_api` scope. Changes need `api` [14].
- `read_api` "grants read access to the API" [15]. The game only reads, so it does not need `api`.
- The Events API docs ask for the `read_user` or `api` scope [3].
- We infer that `read_api` also works for events. The docs do not confirm it.
- Safe choice: a token with `read_api` and `read_user`.
- A token expires after at most 365 days by default [16]. The user must then make a new one.
- A self-managed administrator can change that maximum [16].
- Fine-grained tokens (tokens with rights per resource) exist since version 18.10 [17]. They work with REST and GraphQL. We did not check which rights the game needs.
- A token reads only what its user can see. This is an inference from the scope text [15].

### Rate limits on gitlab.com

- Now: 2,000 authenticated API requests per minute for each user [18].
- Proposed and "not in effect yet": limits per plan [18].
  - Free: 100 per minute and 5,000 per hour.
  - Premium: 1,250 per minute and 15,000 per hour.
  - Ultimate: 2,000 per minute and 25,000 per hour.
- The to-do list has its own limit: 300 requests per minute by default [8].
- Responses carry `RateLimit-Limit` and `RateLimit-Remaining` headers [18].
- A blocked request returns status `429` with a `Retry-After` header [18].
- Design rule: plan for 100 requests per minute. That is the lowest proposed limit.

### Rate limits on self-managed

- The user and IP rate limits are off by default [19].
- When an administrator turns them on, the default is 7,200 requests per hour for each user [19].
- The administrator can set other values [19]. So the client must read the headers and obey `429`.

### GraphQL limits

- At most 100 records per page [14].
- At most 250 complexity points per query for a signed-in user [14]. (Complexity is the cost score of a query.)
- At most 10,000 characters per query [14].
- A request stops after 30 seconds [14].
- Result: one query cannot load many MRs with all their threads. The client must split the work.

### REST paging

- Default page size is 20. The maximum is 100 [20].
- Above 10,000 records, GitLab drops the `x-total` headers [20].
- Offset paging stops at offset 50,000 by default. A self-managed administrator can change it [11].

### How far back the history goes

- User events: 3 years. GitLab removes older ones [4][11].
- MRs, notes, discussions and approvals: the docs state no end date. We infer they stay as long as the MR exists.
- To-do items: no stated period [8][9].
- Lost access removes data from view. This is an inference.

### gitlab.com and self-managed

| Topic | gitlab.com | Self-managed |
|---|---|---|
| Rate limit | Fixed by the service [18] | Off by default, set by the administrator [19] |
| Token lifetime | 365 days at most by default [16] | The administrator can change it [16] |
| Offset paging limit | Not stated for the service | 50,000 by default, can change [11] |
| Version | Always the newest | Can be old. New fields can be missing. |
| Tier | All seven signals work on Free [1][3][6][7] | The same |

- Version risk: `mergeRequestInteraction.updatedAt` needs version 19.2 [2].
- Version risk: experimental GraphQL fields can change. We use none of them in the table.
- The client should ask the server for its version first. This is advice, not a docs fact.

### The glab CLI

- `glab api <path>` sends a signed-in REST request. `glab api graphql` sends a GraphQL query [21].
- `glab api --paginate` reads all pages [21].
- `glab` reads the token from `GITLAB_TOKEN`, or from its own login [21].
- `--hostname` selects another server, so self-managed works [21].
- `glab mr list --reviewer=@me --output json` gives the review queue [12].
- Result: `glab` adds no data. It is a simple way to reuse the login of the user.

## Can a client work with no server?

**Yes, for one player.** All signals come from read requests with the token of that player.

What makes it work:

- The Events API gives a time-ordered list of my actions, with `after` and `sort` [3].
- The client can store the time of the last sync. Then it asks only for newer events.
- MR lists accept `updated_after` [1]. So the client reads only MRs that changed.

What is hard:

1. **No push.** The client must poll. The game sees changes only after the next poll. This fits the "return moment" in the design.
2. **Resolved threads cost many requests.** There is no event for "resolved" [4]. The client must read the discussions of each MR that I commented on, again and again. It needs a stop rule, for example "stop 14 days after the merge".
3. **The start time of a review request is weak.** See signal 6. The best source is the to-do item. Its storage period is unknown.
4. **History before the install is limited.** Events go back 3 years [4]. Review request times may not go back at all.
5. **The client must keep some state itself.** Examples: the last sync time, the loot that it already gave. A random drop cannot come from events alone. A fixed rule can help: derive the drop from the event ID. Then two devices get the same result. This is a design idea, not a docs fact.
6. **Two devices.** With no server, two devices share nothing. Each one must compute the same state from GitLab, or the player copies a file.
7. **The token expires.** The player must make a new one at least once a year [16].
8. **Anyone can edit local state.** That is fine. The design says rewards are cosmetic.

What is impossible, or not found in the docs:

- A record of a removed approval, or of a thread that was resolved and opened again.
- An event for "review requested" in the Events API [4].
- Line counts of a diff from REST without counting them in the client [1].
- A live push to a client with no server. Webhooks (HTTP calls that GitLab sends to a URL) need a URL that listens. This is an inference. We did not read the webhook docs.

What it means for the later team ideas:

- One token can read the review work of other users in projects it can see. This is an inference from the filters `reviewer_username` and `approved_by_usernames` [1].
- So a "team boss" may work with no server. Each client would compute it alone. The request cost grows with the team size.

## A possible sync plan

This is a suggestion from the facts above. It is not tested.

1. Each poll: one GraphQL query for my open review queue. Ask for `diffStatsSummary`, `createdAt` and my `reviewState`.
2. Each poll: `GET /events?after=<last sync>` for my new comments and approvals.
3. Each poll: `GET /todos?action=review_requested` for new request times.
4. Less often: for each MR I reviewed and that is still "active", read `merged_at` and the discussions.
5. Stop tracking an MR some days after it merged or closed.

A normal day needs far fewer than 100 requests per minute.

## Not verified

- No request was tested against a real server.
- The meaning of `created_at` in the reviewers endpoint.
- If `read_api` alone is enough for the Events API.
- The exact text and presence of system notes for review requests and approvals.
- The time on a note that was first a pending review comment.
- The effect of the `DiscussionNote` limit on the Events API.
- If `changes_count` counts files.
- How long GitLab keeps to-do items that are done.
- The real complexity score of the GraphQL queries the game needs.
- When the proposed plan limits on gitlab.com start.
- Which fine-grained token rights the game needs.

## Sources

All from docs.gitlab.com, read on 2026-11-10.

1. Merge requests API: https://docs.gitlab.com/api/merge_requests/
2. GraphQL reference, objects (`MergeRequest`, `CurrentUser`, `UserMergeRequestInteraction`, `DiffStatsSummary`, `Discussion`, `Note`, `Todo`): https://docs.gitlab.com/api/graphql/reference/objects/
3. Events API: https://docs.gitlab.com/api/events/
4. Contributions calendar (event types, 3-year removal): https://docs.gitlab.com/user/profile/contributions_calendar/
5. Notes API: https://docs.gitlab.com/api/notes/
6. Merge request approvals API: https://docs.gitlab.com/api/merge_request_approvals/
7. Discussions API: https://docs.gitlab.com/api/discussions/
8. To-do list API: https://docs.gitlab.com/api/todos/
9. To-do list, user docs: https://docs.gitlab.com/user/todos/
10. GraphQL reference, enums (`MergeRequestReviewState`, `TodoActionEnum`): https://docs.gitlab.com/api/graphql/reference/enums/
11. Instance limits: https://docs.gitlab.com/administration/instance_limits/
12. `glab mr list`: https://docs.gitlab.com/cli/mr/list/
13. Merge request reviews, user docs: https://docs.gitlab.com/user/project/merge_requests/reviews/
14. GraphQL API (limits, scopes): https://docs.gitlab.com/api/graphql/
15. Access token scopes: https://docs.gitlab.com/security/tokens/access_token_scopes/
16. Personal access tokens: https://docs.gitlab.com/user/profile/personal_access_tokens/
17. Fine-grained personal access tokens: https://docs.gitlab.com/auth/tokens/fine_grained_access_tokens/
18. Rate limits on gitlab.com: https://docs.gitlab.com/user/gitlab_com/rate_limits/
19. User and IP rate limits: https://docs.gitlab.com/administration/settings/user_and_ip_rate_limits/
20. REST API (paging): https://docs.gitlab.com/api/rest/
21. `glab api`: https://docs.gitlab.com/cli/api/
