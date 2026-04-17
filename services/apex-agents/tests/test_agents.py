"""Tests for apex-agents REST API."""


NEW_BUILTIN_IDS = {
    "research-assistant",
    "qa-expert",
    "writing-assistant",
    "data-analyst",
    "support-agent",
}

# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["agents_count"] == len(NEW_BUILTIN_IDS)


# ---------------------------------------------------------------------------
# GET /agents
# ---------------------------------------------------------------------------


def test_list_agents_returns_all_builtins(client):
    r = client.get("/agents")
    assert r.status_code == 200
    ids = {a["id"] for a in r.json()}
    assert ids == NEW_BUILTIN_IDS


def test_list_agents_have_colors(client):
    for agent in client.get("/agents").json():
        assert agent["color"].startswith("#")
        assert len(agent["color"]) == 7


def test_list_agents_all_marked_builtin(client):
    for agent in client.get("/agents").json():
        assert agent["is_builtin"] is True


# ---------------------------------------------------------------------------
# GET /agents/{id}
# ---------------------------------------------------------------------------


def test_get_research_assistant(client):
    r = client.get("/agents/research-assistant")
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == "research-assistant"
    assert data["is_builtin"] is True
    assert len(data["system_prompt"]) > 50
    assert "rag_query" in data["tools"]


def test_get_qa_expert(client):
    r = client.get("/agents/qa-expert")
    assert r.status_code == 200
    data = r.json()
    assert "rag_query" in data["tools"]


def test_get_data_analyst(client):
    r = client.get("/agents/data-analyst")
    assert r.status_code == 200
    assert "code_exec" in r.json()["tools"]


def test_get_agent_not_found(client):
    assert client.get("/agents/nonexistent").status_code == 404


def test_old_agents_do_not_exist(client):
    """Verify the old dev-workflow agents are completely gone."""
    for old_id in ("orchestrator", "planner", "architect", "solutioner",
                   "tester", "maintenance", "skill-creator"):
        assert client.get(f"/agents/{old_id}").status_code == 404, \
            f"Old agent '{old_id}' should not exist"


# ---------------------------------------------------------------------------
# POST /agents  (create)
# ---------------------------------------------------------------------------


def test_create_agent(client):
    payload = {
        "id": "my-agent",
        "name": "My Custom Agent",
        "description": "A test agent",
        "color": "#ff6600",
        "system_prompt": "You are a helpful test agent.",
        "tools": ["rag_query", "memory_read"],
        "handoffs": [],
    }
    r = client.post("/agents", json=payload)
    assert r.status_code == 201
    data = r.json()
    assert data["id"] == "my-agent"
    assert data["is_builtin"] is False
    assert data["color"] == "#ff6600"


def test_create_agent_duplicate_id(client):
    r = client.post("/agents", json={
        "id": "research-assistant",
        "name": "Duplicate",
        "color": "#aabbcc",
        "system_prompt": "",
    })
    assert r.status_code == 409


def test_create_agent_invalid_id(client):
    r = client.post("/agents", json={
        "id": "My Agent!", "name": "Bad", "color": "#aabbcc", "system_prompt": ""
    })
    assert r.status_code == 422


# ---------------------------------------------------------------------------
# PUT /agents/{id}  (update)
# ---------------------------------------------------------------------------


def test_update_agent(client):
    r = client.put("/agents/writing-assistant", json={"description": "Updated description"})
    assert r.status_code == 200
    assert r.json()["description"] == "Updated description"


def test_update_agent_not_found(client):
    assert client.put("/agents/ghost", json={"name": "Ghost"}).status_code == 404


def test_update_agent_tools(client):
    r = client.put("/agents/support-agent", json={"tools": ["rag_query", "memory_read"]})
    assert r.status_code == 200
    assert set(r.json()["tools"]) == {"rag_query", "memory_read"}


# ---------------------------------------------------------------------------
# DELETE /agents/{id}
# ---------------------------------------------------------------------------


def test_delete_builtin_forbidden(client):
    assert client.delete("/agents/research-assistant").status_code == 403


def test_delete_custom_agent(client):
    client.post("/agents", json={
        "id": "temp-agent", "name": "Temp", "color": "#112233", "system_prompt": ""
    })
    r = client.delete("/agents/temp-agent")
    assert r.status_code == 200
    assert r.json()["deleted"] == "temp-agent"
    assert client.get("/agents/temp-agent").status_code == 404


# ---------------------------------------------------------------------------
# GET /tools  (built-in)
# ---------------------------------------------------------------------------


def test_get_builtin_tools(client):
    r = client.get("/tools")
    assert r.status_code == 200
    tool_ids = {t["id"] for t in r.json()}
    assert {"rag_query", "memory_read", "memory_write", "handoff",
            "code_exec", "web_fetch"}.issubset(tool_ids)


def test_builtin_tools_have_required_fields(client):
    for tool in client.get("/tools").json():
        assert "id" in tool
        assert "name" in tool
        assert "description" in tool
        assert "is_builtin" in tool


def test_removed_tools_absent(client):
    """llm_generate, file_read, web_search were removed — must not appear."""
    tool_ids = {t["id"] for t in client.get("/tools").json()}
    for removed in ("llm_generate", "file_read", "web_search"):
        assert removed not in tool_ids, f"Removed tool '{removed}' should not be listed"


# ---------------------------------------------------------------------------
# POST /tools  (custom tool CRUD)
# ---------------------------------------------------------------------------


SAMPLE_TOOL = {
    "id": "echo-tool",
    "name": "Echo",
    "description": "Returns the input value.",
    "code": "def run(input: dict) -> str:\n    return str(input.get('value', ''))\n",
}


def test_create_custom_tool(client):
    r = client.post("/tools", json=SAMPLE_TOOL)
    assert r.status_code == 201
    data = r.json()
    assert data["id"] == "echo-tool"
    assert data["is_builtin"] is False


def test_create_tool_conflicts_with_builtin(client):
    r = client.post("/tools", json={**SAMPLE_TOOL, "id": "rag_query"})
    assert r.status_code == 409


def test_create_tool_duplicate(client):
    client.post("/tools", json=SAMPLE_TOOL)
    assert client.post("/tools", json=SAMPLE_TOOL).status_code == 409


def test_update_custom_tool(client):
    client.post("/tools", json=SAMPLE_TOOL)
    r = client.put("/tools/echo-tool", json={"description": "Updated"})
    assert r.status_code == 200
    assert r.json()["description"] == "Updated"


def test_update_builtin_tool_forbidden(client):
    assert client.put("/tools/rag_query", json={"description": "x"}).status_code == 403


def test_delete_custom_tool(client):
    client.post("/tools", json=SAMPLE_TOOL)
    assert client.delete("/tools/echo-tool").status_code == 200
    assert client.get("/tools/echo-tool").status_code == 404


def test_delete_builtin_tool_forbidden(client):
    assert client.delete("/tools/rag_query").status_code == 403


def test_custom_tool_appears_in_list(client):
    client.post("/tools", json=SAMPLE_TOOL)
    ids = {t["id"] for t in client.get("/tools").json()}
    assert "echo-tool" in ids


# ---------------------------------------------------------------------------
# POST /tools/test  (sandbox)
# ---------------------------------------------------------------------------


def test_tool_test_success(client):
    code = "def run(input: dict) -> str:\n    return 'hello ' + input.get('name', 'world')\n"
    r = client.post("/tools/test", json={"code": code, "input": {"name": "apex"}})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True
    assert "apex" in data["output"]


def test_tool_test_runtime_error(client):
    code = "def run(input: dict) -> str:\n    raise ValueError('boom')\n"
    r = client.post("/tools/test", json={"code": code, "input": {}})
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is False
    assert data["error"] != ""


def test_tool_test_missing_run_function(client):
    code = "x = 1 + 1\n"
    r = client.post("/tools/test", json={"code": code, "input": {}})
    assert r.status_code == 200
    assert r.json()["success"] is False


def test_tool_test_syntax_error(client):
    code = "def run(input\n    return 'bad'\n"
    r = client.post("/tools/test", json={"code": code, "input": {}})
    assert r.status_code == 200
    assert r.json()["success"] is False
