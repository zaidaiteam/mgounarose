import { Badge, Empty, Field } from "@/components/fields";
import { localDate } from "@/lib/domain";
import type { Actor } from "@/lib/staff/repository";
import { roleLabels, type Workspace } from "@/lib/staff/types";
import { StaffForm, EmployeeField, RoleField } from "./forms";
import { staffDate } from "./orders";

export function StaffTeam({
  data,
  actor,
  selected,
}: {
  data: Workspace;
  actor: Actor;
  selected?: string;
}) {
  return (
    <>
      {actor.role === "admin" && (
        <details className="panel detail">
          <summary>Préautoriser une invitation</summary>
          <p>
            L’invitation expirera après 24 heures. Le lien d’activation est
            fourni par l’administrateur Auth dans l’environnement de test.
          </p>
          <StaffForm
            action="employee.invite"
            section="employees"
            label="Préautoriser l’invitation"
          >
            <Field label="Adresse de test">
              <input
                type="email"
                name="email"
                placeholder="equipe@example.test"
                required
                maxLength={200}
              />
            </Field>
            <Field label="Nom d’affichage">
              <input name="name" required maxLength={100} />
            </Field>
            <RoleField />
          </StaffForm>
        </details>
      )}
      <section className="panel detail">
        {data.employees.map((item) => (
          <details
            className="staff-detail"
            key={item.id}
            open={selected === item.id || undefined}
          >
            <summary>
              <strong>{item.name}</strong>
              <span>{roleLabels[item.role]}</span>
              <Badge>{item.active ? "Actif" : "Inactif"}</Badge>
            </summary>
            {actor.role === "admin" && item.role !== "admin" && (
              <StaffForm
                action="employee.change"
                section="employees"
                label="Enregistrer le membre"
                fields={{ id: item.id }}
              >
                <RoleField initial={item.role} />
                <label>
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={item.active}
                  />{" "}
                  Compte actif
                </label>
              </StaffForm>
            )}
          </details>
        ))}
      </section>
    </>
  );
}
export function StaffTasks({
  data,
  editorial,
  selected,
}: {
  data: Workspace;
  editorial: boolean;
  selected?: string;
}) {
  const list = [...data.tasks].sort(
    (a, b) => Number(b.id === selected) - Number(a.id === selected),
  );
  return (
    <>
      <details className="panel detail">
        <summary>Nouvelle tâche ou rappel</summary>
        <StaffForm
          action="task.create"
          section="tasks"
          label="Enregistrer la tâche"
        >
          <Field label="Objet">
            <input name="title" maxLength={120} required />
          </Field>
          <Field label="Type">
            <select name="kind">
              <option value="task">Tâche</option>
              <option value="callback">Rappel</option>
            </select>
          </Field>
          <Field label="Date">
            <input type="date" name="due" defaultValue={localDate()} required />
          </Field>
          <Field label="Client">
            <select name="customer_id">
              <option value="">Sans client</option>
              {data.customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </Field>
          {editorial && (
            <EmployeeField
              name="assignee_id"
              label="Responsable"
              list={data.employees}
            />
          )}
        </StaffForm>
      </details>
      <section className="panel detail">
        {list.length ? (
          list.map((item) => (
            <article key={item.id} className="section-heading">
              <div>
                <h3>{item.title}</h3>
                <small>
                  {item.kind === "callback" ? "Rappel" : "Tâche"}
                  {item.due_at && " · " + staffDate(item.due_at)} ·{" "}
                  {item.status === "done" ? "Terminée" : "Ouverte"}
                </small>
                {item.order_id && (
                  <p>
                    <a
                      className="text-link"
                      href={`?section=orders&id=${item.order_id}`}
                    >
                      Voir la commande liée
                    </a>
                  </p>
                )}
              </div>
              <StaffForm
                action="task.toggle"
                section="tasks"
                inline
                label={item.status === "done" ? "Rouvrir" : "Terminer"}
                fields={{
                  id: item.id,
                  status: item.status === "done" ? "open" : "done",
                }}
              />
            </article>
          ))
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
export function StaffAudit({ data }: { data: Workspace }) {
  return (
    <section className="panel list-panel">
      {data.audit.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Action</th>
                <th>Objet</th>
                <th>Acteur</th>
              </tr>
            </thead>
            <tbody>
              {data.audit.map((item) => (
                <tr key={item.id}>
                  <td>{staffDate(item.created_at)}</td>
                  <td>{item.action}</td>
                  <td>
                    {item.entity}
                    {item.entity_id && " · " + item.entity_id.slice(0, 8)}
                  </td>
                  <td>
                    {data.employees.find(
                      (employee) => employee.id === item.actor_id,
                    )?.name ?? "Compte indisponible"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty />
      )}
    </section>
  );
}
