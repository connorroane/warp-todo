"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Todo {
  id: string;
  title: string;
  is_complete: boolean;
  created_at: string;
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTodos(data);
    }
    setLoading(false);
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const { data, error } = await supabase
      .from("todos")
      .insert({ title: newTodo.trim() })
      .select()
      .single();

    if (!error && data) {
      setTodos([data, ...todos]);
      setNewTodo("");
    }
  }

  async function toggleTodo(id: string, isComplete: boolean) {
    const { error } = await supabase
      .from("todos")
      .update({ is_complete: !isComplete })
      .eq("id", id);

    if (!error) {
      setTodos(
        todos.map((t) =>
          t.id === id ? { ...t, is_complete: !isComplete } : t
        )
      );
    }
  }

  async function deleteTodo(id: string) {
    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (!error) {
      setTodos(todos.filter((t) => t.id !== id));
    }
  }

  if (loading) {
    return <p className="text-gray-500 text-center">Loading todos...</p>;
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <form onSubmit={addTodo} className="flex gap-2 mb-6">
        <input
          type="text"
          placeholder="What needs to be done?"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Add
        </button>
      </form>

      {todos.length === 0 ? (
        <p className="text-gray-400 text-center text-sm">
          No todos yet. Add one above!
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todos.map((todo) => (
            <li
              key={todo.id}
              className="flex items-center gap-3 border border-gray-200 rounded px-3 py-2"
            >
              <input
                type="checkbox"
                checked={todo.is_complete}
                onChange={() => toggleTodo(todo.id, todo.is_complete)}
                className="h-4 w-4 accent-blue-600"
              />
              <span
                className={`flex-1 text-sm ${
                  todo.is_complete
                    ? "line-through text-gray-400"
                    : "text-gray-800"
                }`}
              >
                {todo.title}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
