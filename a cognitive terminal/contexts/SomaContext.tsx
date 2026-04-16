

import React, { createContext, useReducer, useContext, Dispatch } from 'react';
import type { SomaAppState, SomaAction } from '../types';

export const initialState: SomaAppState = {
  history: [],
  isLoading: false,
  currentPath: '~',
  isAgentConnected: false,
  awaitingConfirmation: null,
  suggestions: [],
};

export const somaReducer = (state: SomaAppState, action: SomaAction): SomaAppState => {
  switch (action.type) {
    case 'ADD_HISTORY':
      return {
        ...state,
        history: [...state.history, ...action.payload],
      };
    case 'UPDATE_HISTORY':
      return {
          ...state,
          history: state.history.map(item =>
              item.id === action.payload.id ? { ...item, content: action.payload.content } : item
          ),
      };
    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
        suggestions: [],
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_PATH':
      return {
        ...state,
        currentPath: action.payload,
      };
    case 'SET_AGENT_CONNECTED':
      return {
        ...state,
        isAgentConnected: action.payload,
      };
    case 'SET_AWAITING_CONFIRMATION':
      return {
        ...state,
        awaitingConfirmation: action.payload,
      };
    case 'SET_SUGGESTIONS':
        return {
            ...state,
            suggestions: action.payload,
        };
    case 'INIT_STATE':
        return {
            ...state,
            ...action.payload
        };
    default:
      return state;
  }
};

interface SomaContextType {
  state: SomaAppState;
  dispatch: Dispatch<SomaAction>;
}

const SomaContext = createContext<SomaContextType>({
  state: initialState,
  dispatch: () => null,
});

export const SomaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(somaReducer, initialState);

  return (
    <SomaContext.Provider value={{ state, dispatch }}>
      {children}
    </SomaContext.Provider>
  );
};

export const useSoma = () => useContext(SomaContext);