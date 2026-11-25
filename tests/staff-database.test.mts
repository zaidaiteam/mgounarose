import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import { parseCommand } from "../src/lib/staff/validation.ts";

const fixture = (path: string) =>
  readFile(new URL(path, import.meta.url), "utf8");
const migration = "../supabase/migrations/20261125133313_rose_staff_v03.sql";
const user = (id: number) => `10000000-0000-4000-8000-00000000000${id}`;
const session = (id: number) => `20000000-0000-4000-8000-00000000000${id}`;
const atlas = "30000000-0000-4000-8000-000000000001";
const atlasAddress = "40000000-0000-4000-8000-000000000001";
const oasis = "30000000-0000-4000-8000-000000000002";
const order = "51000001-0000-4000-8000-000000000001";
const secondOrder = "51000002-0000-4000-8000-000000000002";
const variant = "61000000-0000-4000-8000-000000000001";
const guide = "70000000-0000-4000-8000-000000000001";
const draftGuide = "70000000-0000-4000-8000-000000000002";
const db = new PGlite();
const deny = { code: "42501" };
const identity = (id: number, sid = session(id)) =>
  db.query("select rose_care.staff_identity($1,$2) as result", [user(id), sid]);
const command = (id: number, action: string, payload: unknown) =>
  db.query<{ id: string }>(
    "select rose_care.staff_command($1,$2,$3,$4::jsonb) as id",
    [user(id), session(id), action, JSON.stringify(payload)],
  );
async function workspace(id: number) {
  const { rows } = await db.query<{
    result: import("../src/lib/staff/types.ts").Workspace;
  }>("select rose_care.staff_workspace($1,$2) as result", [
    user(id),
    session(id),
  ]);
  return rows[0].result;
}

before(async () => {
  for (const file of [
    "./fixtures/rose-baseline.sql",
    migration,
    "./fixtures/staff-data.sql",
    "../supabase/fixtures/content.sql",
  ])
    await db.exec(await fixture(file));
  await db.exec("set role rose_care_app");
});
after(async () => db.close());

test("access requires a current matching session and an active, explicitly scoped employee", async () => {
  await assert.rejects(identity(2, session(3)), deny);
  await assert.rejects(identity(4), deny);
  await assert.rejects(identity(8), deny);
  assert.deepEqual((await identity(2)).rows[0], {
    result: { id: user(2), name: "Conseiller Démo Atlas", role: "advisor" },
  });
  await db.exec("reset role");
  try {
    await db.query(
      "update auth.sessions set not_after=now()-interval '1 second' where id=$1",
      [session(7)],
    );
    await db.exec("set role rose_care_app");
    await assert.rejects(identity(7), deny);
    await db.exec("reset role");
    await db.query("update auth.sessions set not_after=null where id=$1", [
      session(7),
    ]);
  } finally {
    await db.exec("set role rose_care_app");
  }
});

test("runtime role cannot read tables; customer and care-guide scopes do not cross advisors", async () => {
  await assert.rejects(db.query("select id from rose_care.customers"), deny);
  assert.deepEqual(
    (await workspace(2)).customers.map((item) => item.id),
    [atlas],
  );
  assert.deepEqual(
    (await workspace(2)).orders.map((item) => item.id),
    [order],
  );
  assert.deepEqual(
    (await workspace(3)).customers.map((item) => item.id),
    [oasis],
  );
  await assert.rejects(
    command(2, "customer.note", { customer_id: oasis, note: "Fixture note" }),
    deny,
  );
  await assert.rejects(
    command(2, "order.transition", {
      id: secondOrder,
      version: 1,
      status: "confirmed",
    }),
    deny,
  );
  assert.equal((await workspace(1)).customers.length, 2);
  await assert.rejects(
    command(1, "complaint.create", {
      customer_id: atlas,
      order_id: secondOrder,
      category: "Fictive",
      details: "Fictive",
    }),
    deny,
  );
});

test("only the authorized roles may confirm and operate the assigned order; stale versions are rejected", async () => {
  await assert.rejects(
    command(5, "order.transition", {
      id: order,
      version: 1,
      status: "confirmed",
    }),
    deny,
  );
  await assert.rejects(
    command(6, "order.transition", {
      id: order,
      version: 1,
      status: "confirmed",
    }),
    deny,
  );
  await command(2, "order.transition", {
    id: order,
    version: 1,
    status: "confirmed",
  });
  await assert.rejects(
    command(2, "order.transition", {
      id: order,
      version: 1,
      status: "cancelled",
    }),
    { code: "40001" },
  );
  await assert.rejects(
    command(2, "order.transition", {
      id: order,
      version: 2,
      status: "preparing",
    }),
    deny,
  );
  await command(6, "order.transition", {
    id: order,
    version: 2,
    status: "preparing",
  });
  await command(5, "order.transition", {
    id: order,
    version: 3,
    status: "dispatched",
  });
  const next = (await workspace(2)).orders[0];
  assert.equal(next.status, "dispatched");
  assert.deepEqual(
    next.history.map((event) => event.status),
    ["confirmed", "preparing", "dispatched"],
  );
});

test("financial and identity data is omitted for assigned fulfillment employees", async () => {
  const ops = await workspace(5);
  assert.equal(ops.orders.length, 1);
  assert.equal(ops.orders[0].delivery_city, "Casablanca");
  for (const key of [
    "total",
    "shipping",
    "discount",
    "currency",
    "customer_name",
    "customer_id",
  ] as const)
    assert.equal(ops.orders[0][key], null);
  assert.equal(ops.orders[0].items[0].unit_price, null);
  assert.equal(ops.customers.length, 0);
  assert.ok(
    ops.products.every((product) =>
      product.variants.every((item) => item.price === null),
    ),
  );
  assert.equal((await workspace(6)).orders[0].delivery_address, null);
});

test("orders, line items, history and critical audit events commit together or roll back", async () => {
  const count = (await workspace(2)).orders.length;
  const spec = {
    customer_id: atlas,
    address_id: atlasAddress,
    lines: [{ variant_id: variant, quantity: 2 }],
  };
  await assert.rejects(command(2, "order.create", { ...spec, shipping: "5" }), {
    code: "22023",
  });
  await assert.rejects(
    command(2, "order.create", {
      ...spec,
      lines: [...spec.lines, { variant_id: variant, quantity: 1 }],
    }),
    { code: "22023" },
  );
  assert.equal((await workspace(2)).orders.length, count);
  const created = await command(2, "order.create", spec);
  const current = (await workspace(2)).orders.find(
    (item) => item.id === created.rows[0].id,
  )!;
  assert.equal(current.total, 42.5);
  assert.equal(current.items[0].quantity, 2);
  assert.equal(current.history[0].status, "new");
  assert.ok(
    (await workspace(1)).audit.some(
      (item) => item.action === "order.create" && item.entity_id === current.id,
    ),
  );
  await db.exec("reset role");
  try {
    await db.exec(`create function rose_care.fail_test_audit() returns trigger language plpgsql as $$ begin
      if new.action='order.create' then raise exception 'forced audit failure'; end if; return new; end $$;
      create trigger fail_audit before insert on rose_care.audit_logs for each row execute function rose_care.fail_test_audit();`);
    await db.exec("set role rose_care_app");
    await assert.rejects(command(2, "order.create", spec), { code: "P0001" });
    assert.equal((await workspace(2)).orders.length, count + 1);
  } finally {
    await db.exec(
      "reset role; drop trigger fail_audit on rose_care.audit_logs; drop function rose_care.fail_test_audit(); set role rose_care_app;",
    );
  }
});

test("role changes, invitation redemption and immediate employee deactivation are enforced", async () => {
  await assert.rejects(
    command(2, "employee.change", {
      id: user(2),
      role: "manager",
      active: true,
    }),
    deny,
  );
  await assert.rejects(
    command(7, "employee.change", {
      id: user(2),
      role: "manager",
      active: true,
    }),
    deny,
  );
  await assert.rejects(
    command(1, "employee.change", {
      id: user(1),
      role: "manager",
      active: false,
    }),
    deny,
  );
  await assert.rejects(
    command(1, "employee.change", { id: user(3), role: "admin", active: true }),
    { code: "22023" },
  );
  await command(1, "employee.invite", {
    email: "invited@example.test",
    name: "Conseiller invité",
    role: "advisor",
  });
  await assert.rejects(identity(9), deny);
  await db.query("select rose_care.staff_redeem($1,$2)", [user(9), session(9)]);
  assert.ok((await identity(9)).rows.length);
  await assert.rejects(
    db.query("select rose_care.staff_redeem($1,$2)", [user(9), session(9)]),
    deny,
  );
  await command(1, "employee.change", {
    id: user(9),
    role: "advisor",
    active: false,
  });
  await assert.rejects(identity(9), deny);
});

test("the private guide grants exactly the approved fixture path, with auth session and RLS", async () => {
  const result = await db.query(
    "select rose_care.staff_guide_path($1,$2,$3) path",
    [user(2), session(2), guide],
  );
  assert.deepEqual(result.rows, [{ path: "fictional/demo.pdf" }]);
  await assert.rejects(
    db.query("select rose_care.staff_guide_path($1,$2,$3)", [
      user(2),
      session(2),
      draftGuide,
    ]),
    deny,
  );
  await assert.rejects(
    db.query("select rose_care.staff_guide_path($1,$2,$3)", [
      user(5),
      session(5),
      guide,
    ]),
    deny,
  );
  await db.exec("reset role; set role authenticated");
  try {
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)",
      [user(2), JSON.stringify({ session_id: session(2) })],
    );
    assert.deepEqual(
      (await db.query("select name from storage.objects")).rows,
      [{ name: "fictional/demo.pdf" }],
    );
    await db.query(
      "select set_config('request.jwt.claim.sub',$1,false), set_config('request.jwt.claims',$2,false)",
      [user(5), JSON.stringify({ session_id: session(5) })],
    );
    assert.deepEqual(
      (await db.query("select name from storage.objects")).rows,
      [],
    );
    await assert.rejects(
      db.query("select rose_care.staff_workspace($1,$2)", [
        user(2),
        session(2),
      ]),
      deny,
    );
  } finally {
    await db.exec("reset role; set role rose_care_app");
  }
});

test("audit reads are administrator-only and events cannot be updated or removed", async () => {
  assert.equal((await workspace(2)).audit.length, 0);
  assert.equal((await workspace(7)).audit.length, 0);
  assert.ok((await workspace(1)).audit.length > 0);
  await assert.rejects(db.query("delete from rose_care.audit_logs"), deny);
  await db.exec("reset role");
  try {
    await assert.rejects(
      db.query("update rose_care.audit_logs set action='changed'"),
      deny,
    );
    await assert.rejects(db.query("truncate rose_care.order_events"), deny);
  } finally {
    await db.exec("set role rose_care_app");
  }
});

test("server input validation rejects unexpected properties and unsafe identifiers", () => {
  const form = new FormData();
  form.set("action", "order.transition");
  form.set("id", order);
  form.set("version", "1");
  form.set("status", "confirmed");
  assert.ok(parseCommand(form));
  form.set("role", "admin");
  assert.equal(parseCommand(form), null);
  form.delete("role");
  form.append("id", secondOrder);
  assert.equal(parseCommand(form), null);
});

test(
  "real PostgreSQL competing updates with the same version have a single winner",
  { skip: !process.env.ROSE_TEST_POSTGRES_URL },
  async () => {
    const target = new URL(process.env.ROSE_TEST_POSTGRES_URL!);
    assert.ok(
      ["127.0.0.1", "localhost", "[::1]"].includes(target.hostname) &&
        target.pathname === "/rose_care_ci",
      "The concurrency fixture can run only against the dedicated loopback test database",
    );
    const pg = postgres(target.href, { max: 3, prepare: false });
    try {
      for (const file of [
        "./fixtures/rose-baseline.sql",
        migration,
        "./fixtures/staff-data.sql",
      ])
        await pg.unsafe(await fixture(file)).simple();
      const execute = (status: string) =>
        pg.begin(async (tx) => {
          await tx`set local role rose_care_app`;
          return tx`select rose_care.staff_command(${user(2)}::uuid,${session(2)}::uuid,'order.transition',${pg.json({ id: order, version: 1, status })})`;
        });
      const outcomes = await Promise.allSettled([
        execute("confirmed"),
        execute("cancelled"),
      ]);
      assert.equal(
        outcomes.filter((item) => item.status === "fulfilled").length,
        1,
      );
      assert.equal(
        outcomes.find((item) => item.status === "rejected")?.reason.code,
        "40001",
      );
      const [events] =
        await pg`select count(*)::int as count from rose_care.order_events where order_id=${order}::uuid`;
      assert.equal(events.count, 1);
      const assign = (logistics_id: string) =>
        pg.begin(async (tx) => {
          await tx`set local role rose_care_app`;
          return tx`select rose_care.staff_command(${user(7)}::uuid,${session(7)}::uuid,'order.assign',${pg.json({ id: secondOrder, version: 1, logistics_id })})`;
        });
      const competing = await Promise.allSettled([assign(user(5)), assign("")]);
      assert.equal(
        competing.filter((item) => item.status === "fulfilled").length,
        1,
      );
      assert.equal(
        competing.find((item) => item.status === "rejected")?.reason.code,
        "40001",
      );
      const [assigned] =
        await pg`select version from rose_care.orders where id=${secondOrder}::uuid`;
      assert.equal(assigned.version, 2);
    } finally {
      await pg.end();
    }
  },
);

test("verified catalog constraints, indexes, grants and all private function privileges survive migration", async () => {
  const baseline: {
    relname: string;
    columns: string[];
    constraints: string[];
    indexes: string[];
    acl: string;
  }[] = JSON.parse(await fixture("./fixtures/rose-catalog.json"));
  assert.equal(baseline.length, 18);
  const actual = await db.query<{
    name: string;
    columns: string[];
    constraints: string[];
    indexes: string[];
    rls: boolean;
    no_browsers: boolean;
    service_select: boolean;
    service_insert: boolean;
    service_update: boolean;
  }>(`
    select c.relname as name,c.relrowsecurity as rls,
      array(select attname||':'||format_type(atttypid,atttypmod) from pg_attribute where attrelid=c.oid and attnum>0 and not attisdropped) columns,
      array(select conname||':'||pg_get_constraintdef(oid) from pg_constraint where conrelid=c.oid) constraints,
      array(select indexdef from pg_indexes where schemaname='rose_care' and tablename=c.relname) indexes,
      not exists(select 1 from unnest(array['anon','authenticated','rose_care_app']) a(role)
        where has_table_privilege(a.role,c.oid,'SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER')) no_browsers,
      has_table_privilege('service_role',c.oid,'SELECT') service_select,
      has_table_privilege('service_role',c.oid,'INSERT') service_insert,
      has_table_privilege('service_role',c.oid,'UPDATE') service_update
    from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='rose_care' and c.relkind='r'`);
  assert.equal(actual.rows.length, 19);
  assert.ok(actual.rows.every((row) => row.rls && row.no_browsers));
  for (const row of baseline) {
    const next = actual.rows.find((item) => item.name === row.relname)!;
    for (const column of row.columns)
      assert.ok(next.columns.includes(column), row.relname + " " + column);
    for (const rule of row.constraints)
      if (!rule.startsWith("orders_status_check:"))
        assert.ok(next.constraints.includes(rule), rule);
    for (const index of row.indexes)
      assert.ok(next.indexes.includes(index), index);
    const appendOnly = ["audit_logs", "order_events"].includes(row.relname);
    assert.equal(next.service_select, !appendOnly);
    assert.equal(next.service_insert, !appendOnly);
    assert.equal(
      next.service_update,
      !appendOnly && row.acl.includes("service_role=arw"),
    );
  }
  const funcs = await db.query<{
    name: string;
    app: boolean;
    browsers: boolean;
    open: boolean;
  }>(`
    select p.proname name,has_function_privilege('rose_care_app',p.oid,'EXECUTE') app,
      exists(select 1 from unnest(array['anon','authenticated','service_role']) a(role)
        where has_function_privilege(a.role,p.oid,'EXECUTE')) browsers,
      exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl
        where acl.grantee=0 and acl.privilege_type='EXECUTE') open
      from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='rose_care'`);
  assert.ok(funcs.rows.every((f) => !f.browsers && !f.open));
  assert.deepEqual(
    funcs.rows
      .filter((f) => f.app)
      .map((f) => f.name)
      .sort(),
    [
      "staff_command",
      "staff_guide_path",
      "staff_identity",
      "staff_redeem",
      "staff_workspace",
    ],
  );
});

test("numeric(12,2) accepts the maximum exact COD and rejects overflow without writes", async () => {
  const list = (await workspace(1)).products.flatMap((item) => item.variants);
  const lines = [
    ...list
      .slice(0, 10)
      .map((item) => ({
        variant_id: item.id,
        quantity: 999,
        unit_price: "999999",
      })),
    { variant_id: list[10].id, quantity: 999, unit_price: "10000" },
    { variant_id: list[11].id, quantity: 1, unit_price: "19989.99" },
  ];
  const payload = {
    customer_id: atlas,
    address_id: atlasAddress,
    lines,
    shipping: "0.00",
  };
  const created = (await command(1, "order.create", payload)).rows[0].id;
  const view = await workspace(1);
  assert.equal(
    view.orders.find((item) => item.id === created)?.total,
    9999999999.99,
  );
  await assert.rejects(
    command(1, "order.create", { ...payload, shipping: "0.01" }),
    { code: "22003" },
  );
  await assert.rejects(
    command(1, "order.create", { ...payload, shipping: "1000000.00" }),
    { code: "22023" },
  );
  assert.equal((await workspace(1)).orders.length, view.orders.length);
  const result = await db.query(
    "select 9999999999.99::numeric(12,2)::text as amount",
  );
  assert.deepEqual(result.rows, [{ amount: "9999999999.99" }]);
  await assert.rejects(db.query("select 10000000000.00::numeric(12,2)"), {
    code: "22003",
  });
  await assert.rejects(db.query("select 9999999999.995::numeric(12,2)"), {
    code: "22003",
  });
});

test("unmarked orders stay hidden even when their customer is a fixture", async () => {
  await db.exec("reset role");
  try {
    await db.query(
      "insert into rose_care.orders(id,customer_id,advisor_id,total) values($1,$2,$3,12)",
      ["51000003-0000-4000-8000-000000000003", atlas, user(2)],
    );
  } finally {
    await db.exec("set role rose_care_app");
  }
  assert.ok(
    (await workspace(1)).orders.every((item) => item.reference !== "51000003"),
  );
  await assert.rejects(
    command(1, "order.transition", {
      id: "51000003-0000-4000-8000-000000000003",
      version: 1,
      status: "confirmed",
    }),
    deny,
  );
});
