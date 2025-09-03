'use client';

import React, { useState } from 'react';
import Tags from '../chat/Tags';
import RichTextInput from '../common/RichTextInput';

interface Note {
  id: string;
  title: string;
  content: string;
  tags: any[];
  createdAt: Date;
  updatedAt: Date;
}

const Notes: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Project Ideas',
      content:
        'Here are some ideas for the brAInwav project:\n\n1. AI-powered code review\n2. Automated documentation generation\n3. Intelligent debugging assistant',
      tags: [{ id: '1', name: 'Ideas', color: 'bg-blue-100 text-blue-800' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      title: 'Meeting Notes',
      content:
        'Discussed the following topics:\n\n- Integration with Cortex-OS\n- UI/UX improvements\n- Performance optimization',
      tags: [
        { id: '2', name: 'Meeting', color: 'bg-green-100 text-green-800' },
        { id: '3', name: 'Planning', color: 'bg-yellow-100 text-yellow-800' },
      ],
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000),
    },
  ]);

  const [selectedNote, setSelectedNote] = useState<Note | null>(notes[0] || null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleSelectNote = (note: Note) => {
    setSelectedNote(note);
    setIsEditing(false);
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      content: '',
      tags: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setNotes([newNote, ...notes]);
    setSelectedNote(newNote);
    setIsEditing(true);
    setEditTitle(newNote.title);
    setEditContent(newNote.content);
  };

  const handleEditNote = () => {
    if (selectedNote) {
      setIsEditing(true);
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
    }
  };

  const handleSaveNote = () => {
    if (selectedNote) {
      const updatedNotes = notes.map((note) =>
        note.id === selectedNote.id
          ? {
              ...note,
              title: editTitle,
              content: editContent,
              updatedAt: new Date(),
            }
          : note,
      );

      setNotes(updatedNotes);
      setSelectedNote({
        ...selectedNote,
        title: editTitle,
        content: editContent,
        updatedAt: new Date(),
      });
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (selectedNote) {
      setEditTitle(selectedNote.title);
      setEditContent(selectedNote.content);
    }
  };

  const handleDeleteNote = () => {
    if (selectedNote) {
      const updatedNotes = notes.filter((note) => note.id !== selectedNote.id);
      setNotes(updatedNotes);
      setSelectedNote(updatedNotes[0] || null);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900">Notes</h1>
        <button
          onClick={handleCreateNote}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          New Note
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full p-2 border rounded"
            />
          </div>
          <ul className="divide-y">
            {notes.map((note) => (
              <li
                key={note.id}
                className={`p-3 cursor-pointer hover:bg-gray-50 ${
                  selectedNote?.id === note.id ? 'bg-blue-50' : ''
                }`}
                onClick={() => handleSelectNote(note)}
              >
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-900 truncate">{note.title}</h3>
                  <span className="text-xs text-gray-500">
                    {note.updatedAt.toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1 truncate">
                  {note.content.substring(0, 100)}
                  {note.content.length > 100 ? '...' : ''}
                </p>
                {note.tags.length > 0 && (
                  <div className="mt-2">
                    <Tags tags={note.tags} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 flex flex-col">
          {selectedNote ? (
            <>
              <div className="p-4 border-b">
                {isEditing ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xl font-bold p-2 border rounded"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-gray-900">{selectedNote.title}</h2>
                )}
                <div className="flex items-center mt-2">
                  <span className="text-sm text-gray-500">
                    Last updated: {selectedNote.updatedAt.toLocaleString()}
                  </span>
                  <div className="ml-4">
                    <Tags tags={selectedNote.tags} />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {isEditing ? (
                  <RichTextInput value={editContent} onChange={setEditContent} className="h-full" />
                ) : (
                  <div className="whitespace-pre-wrap">{selectedNote.content}</div>
                )}
              </div>

              <div className="p-4 border-t flex justify-between">
                {isEditing ? (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveNote}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <button
                      onClick={handleEditNote}
                      className="px-4 py-2 border rounded hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDeleteNote}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete
                    </button>
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  {selectedNote.content.split(/\s+/).filter(Boolean).length} words
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 mx-auto text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No note selected</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Select a note from the list or create a new one
                </p>
                <div className="mt-6">
                  <button
                    onClick={handleCreateNote}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-500 hover:bg-blue-600"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="-ml-1 mr-2 h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    New Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notes;
