import { Edit3, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTaskStore } from "../store";
import { CloseButton, SlideInPanel } from "./primitives";

const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-primary)]";

export function NotesPanel() {
	const { t } = useTranslation();
	const {
		notes,
		notesPanelOpen,
		setNotesPanelOpen,
		loadNotes,
		addNote,
		updateNoteTitle,
		updateNoteContent,
		removeNote,
	} = useTaskStore();

	const [editingId, setEditingId] = useState<number | null>(null);
	const [editContent, setEditContent] = useState("");
	const [editTitle, setEditTitle] = useState("");
	const [dirty, setDirty] = useState(false);
	const contentRef = useRef<HTMLTextAreaElement>(null);
	const titleRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (notesPanelOpen) {
			loadNotes();
		} else {
			setEditingId(null);
		}
	}, [notesPanelOpen, loadNotes]);

	const openNote = useCallback((note: (typeof notes)[0]) => {
		setEditingId(note.id);
		setEditTitle(note.title);
		setEditContent(note.content);
		setDirty(false);
		setTimeout(() => titleRef.current?.focus(), 50);
	}, []);

	const saveNote = useCallback(async () => {
		if (editingId === null) return;
		if (dirty) {
			if (editTitle !== notes.find((n) => n.id === editingId)?.title) {
				await updateNoteTitle(editingId, editTitle);
			}
			if (editContent !== notes.find((n) => n.id === editingId)?.content) {
				await updateNoteContent(editingId, editContent);
			}
			setDirty(false);
		}
	}, [
		editingId,
		dirty,
		editTitle,
		editContent,
		notes,
		updateNoteTitle,
		updateNoteContent,
	]);

	const handleCreate = async () => {
		await addNote();
		const newNotes = useTaskStore.getState().notes;
		if (newNotes.length > 0) {
			openNote(newNotes[0]);
		}
	};

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				if (dirty) saveNote();
				if (editingId !== null) {
					setEditingId(null);
				} else {
					setNotesPanelOpen(false);
				}
			}
		},
		[dirty, saveNote, editingId, setNotesPanelOpen],
	);

	const handleClose = useCallback(() => {
		if (dirty) saveNote();
		setNotesPanelOpen(false);
	}, [dirty, saveNote, setNotesPanelOpen]);

	if (!notesPanelOpen) return null;

	return (
		<SlideInPanel
			open={notesPanelOpen}
			onClose={handleClose}
			ariaLabel={t("notes.title_panel")}
			className="w-[320px] max-w-[90vw]"
			disableEscape
			onKeyDown={handleKeyDown}
		>
			{/* Header */}
			<div className="flex items-center justify-between px-5 pt-4 pb-3">
				<h2 className="text-sm font-medium text-text-primary flex items-center gap-2">
					<Edit3 size={14} className="text-accent-primary" /> {t("notes.title_panel")}
				</h2>
				<CloseButton onClick={handleClose} ariaLabel={t("common.close")} />
			</div>
			<div className="mx-5 h-px bg-border-subtle" />

				{/* Note list */}
				<div className="px-5 pt-3 pb-2">
					<button
						onClick={handleCreate}
						className={`flex items-center gap-1.5 text-xs text-accent-primary hover:text-accent-hover transition-colors cursor-pointer ${FOCUS_RING} rounded-[6px] px-1 py-0.5`}
					>
						<Plus size={12} /> {t("notes.new_note_btn")}
					</button>
				</div>

				<div className="flex flex-col flex-1 min-h-0 px-5 pb-4">
					{/* Note list (shown when no note is being edited) */}
					{editingId === null && (
						<div className="overflow-y-auto space-y-1">
							{notes.length === 0 && (
								<p className="text-xs text-text-tertiary/60 italic pt-2">
									{t("notes.no_notes")}
								</p>
							)}
							{notes.map((note) => (
								<button
									key={note.id}
									onClick={() => {
										if (dirty) saveNote();
										openNote(note);
									}}
									className={`w-full text-left px-2.5 py-2 rounded-[6px] transition-colors cursor-pointer ${FOCUS_RING}
                    ${editingId === note.id ? "bg-accent-primary/15" : "bg-surface-glass hover:bg-surface-elevated"}`}
								>
									<div className="text-xs text-text-primary truncate font-medium">
										{note.title || t("notes.title")}
									</div>
									<div className="text-[11px] text-text-tertiary truncate mt-0.5">
										{note.content
											? note.content.slice(0, 40) +
												(note.content.length > 40 ? "…" : "")
											: t("notes.empty_content")}
									</div>
									<div className="text-[10px] text-text-quaternary mt-0.5">
										{note.updated_at.slice(0, 10)}
									</div>
								</button>
							))}
						</div>
					)}

					{/* Note editor (full width) */}
					{editingId !== null && (
						<div className="flex-1 flex flex-col min-w-0">
							{/* Note title */}
							<input
								ref={titleRef}
								type="text"
								value={editTitle}
								onChange={(e) => {
									setEditTitle(e.target.value);
									setDirty(true);
								}}
								placeholder={t("notes.placeholder_title")}
								className={`w-full bg-transparent text-sm font-medium text-text-primary
                           placeholder-text-tertiary/40 mb-2 font-sans ${FOCUS_RING} rounded-[6px] px-2 py-1`}
							/>

							{/* Note content */}
							<textarea
								ref={contentRef}
								value={editContent}
								onChange={(e) => {
									setEditContent(e.target.value);
									setDirty(true);
								}}
								placeholder={t("notes.placeholder_content")}
								className={`flex-1 w-full bg-surface-glass text-xs text-text-primary
                           px-3 py-2 rounded-[6px] resize-none
                           border border-border-default focus:border-accent-primary/30
                           transition-colors font-sans ${FOCUS_RING}`}
							/>

							{/* Actions */}
							<div className="flex items-center justify-between mt-2">
								<button
									onClick={async () => {
										await saveNote();
										setEditingId(null);
									}}
									className={`text-xs text-accent-primary hover:text-accent-hover transition-colors cursor-pointer ${FOCUS_RING} rounded-[6px] px-2 py-1`}
								>
									{t("common.done")}
								</button>
								<button
									onClick={async () => {
										await removeNote(editingId);
										setEditingId(null);
									}}
									className={`text-xs text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center gap-1 ${FOCUS_RING} rounded-[6px] px-2 py-1`}
								>
									<Trash2 size={11} /> {t("notes.delete_btn")}
								</button>
							</div>
						</div>
					)}
				</div>
			</SlideInPanel>
		);
	}
