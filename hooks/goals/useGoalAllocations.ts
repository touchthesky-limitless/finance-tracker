import { useCallback, useEffect, useReducer, useState } from "react";
import { fetchGoalAllocations } from "@/lib/goals/repository";
import type { GoalAllocation } from "@/lib/goals/types";

type State = {
	status: "idle" | "loading" | "success" | "error";
	allocations: GoalAllocation[];
	error: Error | null;
};

type Action =
	| { type: "FETCH_START" }
	| { type: "FETCH_SUCCESS"; payload: GoalAllocation[] }
	| { type: "FETCH_ERROR"; payload: Error };

const initialState: State = {
	status: "idle",
	allocations: [],
	error: null,
};

function reducer(state: State, action: Action): State {
	switch (action.type) {
		case "FETCH_START":
			return { ...state, status: "loading", error: null };
		case "FETCH_SUCCESS":
			return { status: "success", allocations: action.payload, error: null };
		case "FETCH_ERROR":
			return { status: "error", allocations: [], error: action.payload };
		default:
			return state;
	}
}

export function useGoalAllocations(goalId: string) {
	const [state, dispatch] = useReducer(reducer, initialState);
	const [fetchKey, setFetchKey] = useState(0);

	const reload = useCallback(() => {
		setFetchKey((prev) => prev + 1);
	}, []);

	useEffect(() => {
		let cancelled = false;

		dispatch({ type: "FETCH_START" });

		fetchGoalAllocations(goalId)
			.then((data) => {
				if (!cancelled) {
					dispatch({ type: "FETCH_SUCCESS", payload: data });
				}
			})
			.catch((err) => {
				if (!cancelled) {
					dispatch({
						type: "FETCH_ERROR",
						payload:
							err instanceof Error
								? err
								: new Error("Failed to load allocations"),
					});
				}
			});

		return () => {
			cancelled = true;
		};
	}, [goalId, fetchKey]);

	return {
		allocations: state.allocations,
		loading: state.status === "loading" || state.status === "idle",
		error: state.error,
		reload,
	};
}
