import os
import sys

from clerk_backend_api import Clerk


def update_university_roles(domain: str, new_role: str):
    """
    Finds all users with a specific email domain and assigns them a role.
    Run with: CLERK_SECRET_KEY=sk_test_... uv run python scripts/update_roles.py
    """
    # Initialize Clerk client using the secret key from the environment
    clerk = Clerk(bearer_auth=os.environ.get("CLERK_SECRET_KEY", ""))

    # 1. Fetch all users from Clerk (handles pagination automatically in real scenarios,
    # but here we fetch the first 100 for simplicity)
    # The Clerk Backend API lets us list users
    try:
        users = clerk.users.list(limit=100)
    except Exception as e:
        print(f"Failed to fetch users: {e}")
        sys.exit(1)

    updated_count = 0

    # 2. Iterate through users and check their email domain
    for user in users:
        # Get the user's primary email address
        primary_email = None
        for email_obj in user.email_addresses:
            if email_obj.id == user.primary_email_address_id:
                primary_email = email_obj.email_address
                break

        # Fallback if no primary ID is set
        if not primary_email and len(user.email_addresses) > 0:
            primary_email = user.email_addresses[0].email_address

        if primary_email and primary_email.endswith(f"@{domain}"):
            current_metadata = user.public_metadata or {}
            roles = current_metadata.get("roles", [])

            if new_role not in roles:
                roles.append(new_role)
                current_metadata["roles"] = roles

                # 3. Update the user's metadata in Clerk
                print(
                    f"Updating {primary_email} (ID: {user.id}) to include role '{new_role}'..."
                )
                clerk.users.update(user_id=user.id, public_metadata=current_metadata)
                updated_count += 1
            else:
                print(
                    f"User {primary_email} already has the '{new_role}' role. Skipping."
                )

    print(f"\nDone! Successfully updated {updated_count} users from @{domain}.")


if __name__ == "__main__":
    if not os.environ.get("CLERK_SECRET_KEY"):
        print("Error: CLERK_SECRET_KEY environment variable is missing.")
        sys.exit(1)

    # Example usage: Give everyone at @mahidol.edu the 'researcher' role
    update_university_roles(domain="mahidol.edu", new_role="researcher")
