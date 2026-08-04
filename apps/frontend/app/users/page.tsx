"use client";

import { UserRole } from "@contracts/api-specs/schema";
import { useUpdateUser, useUsers } from "@/lib/api/hooks";
import { Dropdown } from "@/components/ui/Dropdown";
import { SplitText } from "@/components/ui/SplitText";

const ROLE_OPTIONS = UserRole.options;

export default function UsersPage() {
  const { data: users, isLoading, isError } = useUsers();

  return (
    <div className="flex flex-col gap-10">
      <SplitText as="h1" className="text-display font-grotesk">
        Users
      </SplitText>

      {isLoading && <p className="font-mono text-label">Loading…</p>}
      {isError && <p className="font-mono text-label">Failed to load users.</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="font-mono text-label uppercase tracking-[0.08em] py-3">Name</th>
            <th className="font-mono text-label uppercase tracking-[0.08em] py-3">Email</th>
            <th className="font-mono text-label uppercase tracking-[0.08em] py-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {users?.map((user) => (
            <UserRow key={user.id} userId={user.id} name={user.name} email={user.email} role={user.role} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UserRow({
  userId,
  name,
  email,
  role,
}: {
  userId: string;
  name: string;
  email: string;
  role: (typeof ROLE_OPTIONS)[number];
}) {
  const updateUser = useUpdateUser(userId);

  return (
    <tr className="border-b border-black">
      <td className="py-3 text-body font-grotesk">{name}</td>
      <td className="py-3 font-mono text-body">{email}</td>
      <td className="py-3">
        <Dropdown
          label={`Role for ${name}`}
          value={role}
          options={ROLE_OPTIONS}
          onChange={(next) => updateUser.mutate({ role: next })}
        />
      </td>
    </tr>
  );
}
