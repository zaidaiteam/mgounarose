import { Badge, Empty, Field } from "@/components/fields";
import type { Actor } from "@/lib/staff/repository";
import { statusLabels, type Workspace } from "@/lib/staff/types";
import { EmployeeField, LanguageField, StaffForm } from "./forms";
import { staffDate } from "./orders";

export function StaffCustomers({
  data,
  actor,
  selected,
}: {
  data: Workspace;
  actor: Actor;
  selected?: string;
}) {
  const managers = ["admin", "manager"].includes(actor.role);
  return (
    <>
      <details className="panel detail">
        <summary>Ajouter un profil fictif</summary>
        <StaffForm
          action="customer.create"
          section="customers"
          label="Créer le profil"
        >
          <div className="profile-grid">
            <Field label="Nom fictif">
              <input
                name="name"
                placeholder="Démo Atlas"
                pattern="Démo .+"
                maxLength={100}
                required
              />
            </Field>
            <Field label="Civilité">
              <select name="title">
                <option>Mme</option>
                <option>M.</option>
              </select>
            </Field>
            <Field label="E-mail fictif">
              <input
                name="email"
                type="email"
                placeholder="atlas@example.test"
                maxLength={200}
                required
              />
            </Field>
            <Field label="Téléphone fictif">
              <input
                name="phone"
                placeholder="DEMO-120"
                pattern="DEMO-[0-9]{3,8}"
                required
              />
            </Field>
            <Field label="Adresse fictive">
              <input
                name="address"
                placeholder="Adresse fictive Atlas"
                pattern="Adresse fictive .+"
                maxLength={200}
                required
              />
            </Field>
            <Field label="Ville">
              <input name="city" maxLength={80} required />
            </Field>
            <LanguageField />
            {managers && (
              <EmployeeField
                name="advisor_id"
                label="Conseiller attitré"
                list={data.employees.filter((item) => item.role === "advisor")}
                required
              />
            )}
          </div>
        </StaffForm>
      </details>
      <section className="panel detail">
        {data.customers.length ? (
          data.customers.map((customer) => {
            const orders = data.orders.filter(
              (order) => order.customer_id === customer.id,
            );
            const tasks = data.tasks.filter(
              (task) => task.customer_id === customer.id,
            );
            const complaints = data.complaints.filter(
              (item) => item.customer_id === customer.id,
            );
            const conversations = data.conversations.filter(
              (item) => item.customer_id === customer.id,
            );
            return (
              <details
                key={customer.id}
                className="staff-detail"
                open={selected === customer.id || undefined}
              >
                <summary>
                  <strong>{customer.name}</strong>
                  <Badge>{customer.language}</Badge>
                </summary>
                <p>
                  {[customer.title, customer.email, customer.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                <div className="profile-grid">
                  <div>
                    <h3>Adresses</h3>
                    {customer.addresses.map((address) => (
                      <p key={address.id}>
                        {address.address} · {address.city} · {address.country}
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3>Commandes</h3>
                    {orders.map((order) => (
                      <p key={order.id}>
                        <a
                          className="text-link"
                          href={`?section=orders&id=${order.id}`}
                        >
                          RCH-{order.reference}
                        </a>{" "}
                        · {statusLabels[order.status]}
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3>Tâches et rappels</h3>
                    {tasks.map((task) => (
                      <p key={task.id}>
                        <a
                          className="text-link"
                          href={`?section=tasks&id=${task.id}`}
                        >
                          {task.title}
                        </a>
                      </p>
                    ))}
                  </div>
                  <div>
                    <h3>Notes</h3>
                    {customer.notes.map((note, index) => (
                      <p key={index}>{note}</p>
                    ))}
                  </div>
                </div>
                <div className="actions">
                  <a
                    href={`?section=messages&customer=${customer.id}`}
                    className="btn btn-outline"
                  >
                    Préparer un message
                  </a>
                </div>
                <details>
                  <summary>Notes et préférences</summary>
                  <StaffForm
                    action="customer.note"
                    section="customers"
                    label="Ajouter la note"
                    fields={{ customer_id: customer.id }}
                  >
                    <Field label="Note de suivi fictive">
                      <textarea name="note" maxLength={500} required />
                    </Field>
                  </StaffForm>
                  <StaffForm
                    action="customer.preferences"
                    section="customers"
                    label="Enregistrer la préférence"
                    fields={{ customer_id: customer.id }}
                  >
                    <Field label="Canal préféré">
                      <select
                        name="channel"
                        defaultValue={
                          customer.preferences?.preferred_channel ?? "none"
                        }
                      >
                        <option value="none">Aucun</option>
                        <option value="phone">Téléphone</option>
                        <option value="email">E-mail</option>
                      </select>
                    </Field>
                  </StaffForm>
                </details>
                <details>
                  <summary>Réclamations</summary>
                  {complaints.map((item) => (
                    <article className="panel detail" key={item.id}>
                      <h3>{item.category}</h3>
                      <p>{item.details}</p>
                      <Badge>
                        {item.status === "closed" ? "Clôturée" : "Ouverte"}
                      </Badge>
                      {item.status !== "closed" && (
                        <StaffForm
                          action="complaint.close"
                          section="customers"
                          inline
                          label="Clôturer la réclamation"
                          fields={{ id: item.id }}
                        />
                      )}
                    </article>
                  ))}
                  <StaffForm
                    action="complaint.create"
                    section="customers"
                    label="Enregistrer la réclamation"
                    fields={{ customer_id: customer.id }}
                  >
                    <Field label="Catégorie">
                      <input name="category" maxLength={80} required />
                    </Field>
                    <Field label="Commande associée">
                      <select name="order_id">
                        <option value="">Sans commande</option>
                        {orders.map((order) => (
                          <option key={order.id} value={order.id}>
                            RCH-{order.reference}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Description fictive">
                      <textarea name="details" maxLength={1500} required />
                    </Field>
                  </StaffForm>
                </details>
                <details>
                  <summary>Conversations internes</summary>
                  {conversations.map((conversation) => (
                    <article key={conversation.id} className="panel detail">
                      <h3>Conversation · {conversation.channel}</h3>
                      {conversation.messages.map((message) => (
                        <p key={message.id}>
                          <small>
                            {staffDate(message.created_at)} ·{" "}
                            {message.direction}
                          </small>
                          <br />
                          {message.body}
                        </p>
                      ))}
                      <StaffForm
                        action="message.record"
                        section="customers"
                        label="Consigner le message"
                        fields={{ conversation_id: conversation.id }}
                      >
                        <Field label="Message reçu fictif">
                          <textarea name="body" required maxLength={3000} />
                        </Field>
                      </StaffForm>
                    </article>
                  ))}
                  <StaffForm
                    action="conversation.create"
                    section="customers"
                    label="Ouvrir une conversation interne"
                    fields={{ customer_id: customer.id }}
                  />
                </details>
              </details>
            );
          })
        ) : (
          <Empty />
        )}
      </section>
    </>
  );
}
