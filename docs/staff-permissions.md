# Staff roles and permissions

The staff workspace checks the Supabase session and the current `rose_care.employees` row for each read or mutation. These rules apply only to explicitly marked fixtures. A user without an active fixture employee record has no workspace permissions.

| Resource or operation | Admin | Manager | Advisor | Logistics | Preparation |
| --- | --- | --- | --- | --- | --- |
| Customers, addresses, preferences and notes | Fixture customers | Fixture customers | Own assigned customers | None | None |
| Orders and status history | Fixture orders | Fixture orders | Both order and customer assigned to advisor | Only logistics assignments | Only preparation assignments |
| Item price, shipping, discounts, COD and catalog prices | Yes | Yes | Own order amounts and fixture catalog prices | None | None |
| Delivery address and phone | Yes | Yes | Own orders | Assigned orders only | None |
| Create orders | Assigned fixture customers, price override/fees/discounts | Same as Admin | Own customers at catalog prices, no overrides | None | None |
| Confirm and cancel orders | Yes | Yes | Own orders at eligible steps | None | None |
| Start preparation or retry | Yes | Yes | None | None | Assigned orders at eligible steps |
| Dispatch, delivery outcome and return closure | Yes | Yes | None | Assigned orders at eligible steps | None |
| Request return | Yes | Yes | Own delivered orders | Own failed delivery assignments | None |
| Assign fulfillment | Yes | Yes | None | None | None |
| Catalog and bundles | Read and edit | Read and edit | Read | Fulfillment fields only | Fulfillment fields only |
| Templates, guides and FAQ | Read and edit; sign approved fixtures | Same as Admin | Read approved; sign approved fixtures | None | None |
| Tasks/callbacks | Accessible fixture records and assignment | Same as Admin | Own, linked to accessible records | Own, linked to accessible orders | Own, linked to accessible orders |
| Complaints, conversations and message records | Fixture customers | Fixture customers | Own customer and assigned case | None | None |
| Team | Read, preauthorize invitation, manage non-admins | Read | Own record | Own record | Own record |
| Financial performance | Fixture scope | Fixture scope | None | None | None |
| Audit log | Read fixture events | None | None | None | None |

Admin promotion, active Admin deactivation, live data enablement and delivery-provider setup are outside the workspace. The UI limits visible actions, while the database independently checks permitted roles, assignments, approvals, field projections and versioned order transitions.
