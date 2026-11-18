# Making a Version for Another Organization

1. **Name and contacts:** edit the `BRAND` object at the top of the app script (product name, organization, short name, help desk name and phone).
2. **Directory and roles:** replace `DIRECTORY` (and `api/_lib/directory.js`) with the organization's identity provider through single sign on.
3. **Assistants:** edit `ASSISTANTS` (name, scope, greeting, example questions, who can use each one).
4. **Knowledge:** replace `KB` and `MORE_KB` with the organization's own answers and sources, and set owners in `KB_OWNER`.
5. **Policy routing:** edit `POLICY.owners` so cases go to the right teams.
6. **Colors and logo:** change the CSS color variables and the shield icon.
7. Run `npm test` before every deploy.

Check ownership first: under the University System of Georgia intellectual property policy, work created as a job assignment or with more than incidental university resources may belong to the university. Get written confirmation before reusing this code.
