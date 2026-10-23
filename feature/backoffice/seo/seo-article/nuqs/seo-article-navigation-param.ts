"use client";

import { parseAsInteger, parseAsStringLiteral, useQueryStates } from "nuqs";

const navigationParsers = {
  dialog: parseAsStringLiteral(["category", "review"]),
  article: parseAsInteger,
  categoryPhase: parseAsStringLiteral(["category", "topics", "manual", "confirm-manual"]).withDefault("category"),
  reviewPhase: parseAsStringLiteral(["preview", "confirm-publish", "confirm-reject"]).withDefault("preview"),
  edit: parseAsInteger,
  editPhase: parseAsStringLiteral(["edit", "confirm-publish", "confirm-delete"]).withDefault("edit"),
};

/**
 * @description URL เป็นแหล่งสถานะเดียวของหน้าต่างบทความและ phase; เปลี่ยนหน้าต่างแบบ atomic
 * @page /super-admin/hurry-web/seo-article
 * @access super-admin
 * @logic เก็บเฉพาะ navigation ใน URL; ข้อความฟอร์มและผล AI อยู่ใน memory
 */
export const useSeoArticleNavigation = () => {
  const [state, setState] = useQueryStates(navigationParsers, { history: "push", shallow: true });
  return {
    ...state,
    openCategory: () =>
      setState({
        dialog: "category",
        categoryPhase: "category",
        article: null,
        reviewPhase: null,
        edit: null,
        editPhase: null,
      }),
    openReview: (article: number) =>
      setState({ dialog: "review", article, reviewPhase: "preview", categoryPhase: null, edit: null, editPhase: null }),
    closeDialog: () => setState({ dialog: null, article: null, categoryPhase: null, reviewPhase: null }),
    setCategoryPhase: (categoryPhase: typeof state.categoryPhase, replace = false) =>
      setState({ categoryPhase }, { history: replace ? "replace" : "push" }),
    setReviewPhase: (reviewPhase: typeof state.reviewPhase) => setState({ reviewPhase }),
    setEditPhase: (editPhase: typeof state.editPhase) => setState({ editPhase }),
    setEdit: (edit: number | null) =>
      setState({ edit, editPhase: null, dialog: null, article: null, categoryPhase: null, reviewPhase: null }),
  };
};
