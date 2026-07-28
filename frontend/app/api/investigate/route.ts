import { COMPONENTS } from "../../sample-data";

export async function POST(request: Request) {
  let body: { component_id?: string; component_name?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const component = COMPONENTS.find(
    (item) =>
      item.component_id === body.component_id ||
      item.component_name.toLowerCase() === body.component_name?.toLowerCase(),
  );

  if (!component) {
    return Response.json(
      { error: "component_not_found", available: COMPONENTS.map((item) => item.component_id) },
      { status: 404 },
    );
  }

  return Response.json(component, {
    headers: { "cache-control": "no-store" },
  });
}
